import { getDb, withTransaction } from "./db";

const SESSION_COOKIE_NAME = "cvesearch_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface WorkspaceSession {
  sessionId: string;
  userId: string;
  setCookieHeader?: string;
}

export function getOrCreateWorkspaceSession(request: Request): WorkspaceSession {
  const existingSessionId = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (existingSessionId) {
    const existing = getDb().prepare(`
      SELECT id, user_id as userId
      FROM sessions
      WHERE id = ? AND expires_at > ?
    `).get(existingSessionId, new Date().toISOString()) as { id: string; userId: string } | undefined;

    if (existing) {
      return {
        sessionId: existing.id,
        userId: existing.userId,
      };
    }
  }

  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
  const sessionId = crypto.randomUUID();
  const userId = crypto.randomUUID();

  withTransaction((db) => {
    db.prepare(`
      INSERT INTO users (id, display_name, created_at)
      VALUES (?, ?, ?)
    `).run(userId, "Workspace User", createdAt);

    db.prepare(`
      INSERT INTO sessions (id, user_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, userId, createdAt, expiresAt);
  });

  return {
    sessionId,
    userId,
    setCookieHeader: `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  };
}

export function applyWorkspaceSession(response: Response, session: WorkspaceSession): Response {
  if (session.setCookieHeader) {
    response.headers.append("Set-Cookie", session.setCookieHeader);
  }

  return response;
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.trim().split("=");
    if (key === name) {
      return rest.join("=") || null;
    }
  }

  return null;
}
