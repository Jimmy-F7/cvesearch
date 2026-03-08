import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb, withTransaction } from "./db";

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

export interface APIRequestLogRecord {
  id: string;
  route: string;
  method: string;
  status: number;
  durationMs: number;
  limited: boolean;
  clientId: string;
  error: string;
  createdAt: string;
}

interface RateLimitConfig {
  bucket: string;
  maxRequests: number;
  windowMs: number;
}

interface RouteProtectionConfig {
  errorMessage: string;
  rateLimit: RateLimitConfig;
  route: string;
}

type RouteHandler<T extends unknown[]> = (...args: T) => Promise<Response> | Response;

const MAX_STORED_REQUEST_LOGS = 500;
const rateLimitState = new Map<string, RateLimitWindow>();

export function withRouteProtection<T extends [Request, ...unknown[]]>(handler: RouteHandler<T>, config: RouteProtectionConfig): RouteHandler<T> {
  return async (...args: T) => {
    const request = args[0];
    const startedAt = Date.now();
    const clientId = getClientIdentifier(request);
    const limit = consumeRateLimit(clientId, config.rateLimit);

    if (limit.limited) {
      const response = withRateLimitHeaders(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 }),
        config.rateLimit,
        limit.remaining,
        limit.resetAt
      );
      await appendAPIRequestLog({
        route: config.route,
        method: request.method,
        status: 429,
        durationMs: Date.now() - startedAt,
        limited: true,
        clientId,
        error: "rate_limit_exceeded",
      });
      return response;
    }

    try {
      const response = await handler(...args);
      const nextResponse = withRateLimitHeaders(response, config.rateLimit, limit.remaining, limit.resetAt);
      await appendAPIRequestLog({
        route: config.route,
        method: request.method,
        status: nextResponse.status,
        durationMs: Date.now() - startedAt,
        limited: false,
        clientId,
        error: "",
      });
      return nextResponse;
    } catch (error) {
      const response = withRateLimitHeaders(
        NextResponse.json(
          { error: error instanceof Error ? error.message : config.errorMessage },
          { status: 500 }
        ),
        config.rateLimit,
        limit.remaining,
        limit.resetAt
      );
      await appendAPIRequestLog({
        route: config.route,
        method: request.method,
        status: 500,
        durationMs: Date.now() - startedAt,
        limited: false,
        clientId,
        error: error instanceof Error ? error.message : config.errorMessage,
      });
      return response;
    }
  };
}

export async function listRecentAPIRequestLogs(limit = 50): Promise<APIRequestLogRecord[]> {
  const rows = getDb().prepare(`
    SELECT
      id,
      route,
      method,
      status,
      duration_ms as durationMs,
      limited,
      client_id as clientId,
      error,
      created_at as createdAt
    FROM api_request_logs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(normalizeLimit(limit)) as APIRequestLogRow[];

  return rows.map((row) => ({
    id: row.id,
    route: row.route,
    method: row.method,
    status: row.status,
    durationMs: row.durationMs,
    limited: row.limited === 1 || row.limited === true,
    clientId: row.clientId,
    error: row.error,
    createdAt: row.createdAt,
  }));
}

export function resetAPIRateLimits(): void {
  rateLimitState.clear();
}

function consumeRateLimit(clientId: string, config: RateLimitConfig): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = `${config.bucket}:${clientId}`;
  const current = rateLimitState.get(key);

  if (!current || current.resetAt <= now) {
    const next: RateLimitWindow = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitState.set(key, next);
    return {
      limited: false,
      remaining: Math.max(config.maxRequests - next.count, 0),
      resetAt: next.resetAt,
    };
  }

  if (current.count >= config.maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  rateLimitState.set(key, current);
  return {
    limited: false,
    remaining: Math.max(config.maxRequests - current.count, 0),
    resetAt: current.resetAt,
  };
}

function withRateLimitHeaders(response: Response, config: RateLimitConfig, remaining: number, resetAt: number): Response {
  const nextResponse = response instanceof NextResponse ? response : new NextResponse(response.body, response);
  nextResponse.headers.set("X-RateLimit-Limit", String(config.maxRequests));
  nextResponse.headers.set("X-RateLimit-Remaining", String(Math.max(remaining, 0)));
  nextResponse.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
  return nextResponse;
}

function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.trim() || "unknown-agent";
  const seed = `${forwarded || realIp || "local"}:${userAgent}`;
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

async function appendAPIRequestLog(input: Omit<APIRequestLogRecord, "id" | "createdAt">): Promise<void> {
  try {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    withTransaction((db) => {
      db.prepare(`
        INSERT INTO api_request_logs (
          id, route, method, status, duration_ms, limited, client_id, error, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.route,
        input.method,
        input.status,
        input.durationMs,
        input.limited ? 1 : 0,
        input.clientId,
        input.error,
        createdAt
      );

      const overflow = db.prepare(`
        SELECT id
        FROM api_request_logs
        ORDER BY created_at DESC
        LIMIT -1 OFFSET ?
      `).all(MAX_STORED_REQUEST_LOGS) as Array<{ id: string }>;

      for (const row of overflow) {
        db.prepare("DELETE FROM api_request_logs WHERE id = ?").run(row.id);
      }
    });
  } catch {
  }
}

interface APIRequestLogRow {
  id: string;
  route: string;
  method: string;
  status: number;
  durationMs: number;
  limited: number | boolean;
  clientId: string;
  error: string;
  createdAt: string;
}

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) {
    return 50;
  }

  return Math.min(Math.max(Math.floor(limit), 1), 200);
}

export const API_RATE_LIMITS = {
  aiRead: {
    bucket: "ai-read",
    maxRequests: 30,
    windowMs: 60_000,
  },
  aiWrite: {
    bucket: "ai-write",
    maxRequests: 12,
    windowMs: 60_000,
  },
  projectMutations: {
    bucket: "project-mutations",
    maxRequests: 40,
    windowMs: 60_000,
  },
  projectReads: {
    bucket: "project-reads",
    maxRequests: 120,
    windowMs: 60_000,
  },
  workspaceReads: {
    bucket: "workspace-reads",
    maxRequests: 180,
    windowMs: 60_000,
  },
  workspaceMutations: {
    bucket: "workspace-mutations",
    maxRequests: 90,
    windowMs: 60_000,
  },
  githubReads: {
    bucket: "github-reads",
    maxRequests: 60,
    windowMs: 60_000,
  },
  githubScans: {
    bucket: "github-scans",
    maxRequests: 12,
    windowMs: 60_000,
  },
  githubWrites: {
    bucket: "github-writes",
    maxRequests: 12,
    windowMs: 60_000,
  },
  proxy: {
    bucket: "proxy",
    maxRequests: 90,
    windowMs: 60_000,
  },
} as const;
