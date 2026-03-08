import { NextRequest, NextResponse } from "next/server";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { normalizeTriageRecord } from "@/lib/triage-shared";
import { readTriageRecordForUser, writeTriageRecordForUser } from "@/lib/workspace-store";

export const GET = withRouteProtection(async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const response = NextResponse.json(await readTriageRecordForUser(session.userId, decodeURIComponent(id)));
  return applyWorkspaceSession(response, session);
}, {
  route: "/api/triage/[id]",
  errorMessage: "Failed to load triage record",
  rateLimit: API_RATE_LIMITS.workspaceReads,
});

export const PUT = withRouteProtection(async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return applyWorkspaceSession(NextResponse.json({ error: "triage body is required" }, { status: 400 }), session);
  }

  const response = NextResponse.json(await writeTriageRecordForUser(session.userId, normalizeTriageRecord({
    cveId: decodeURIComponent(id),
    status: body.status,
    owner: body.owner,
    notes: body.notes,
    tags: body.tags,
    updatedAt: body.updatedAt,
    activity: body.activity,
  })));
  return applyWorkspaceSession(response, session);
}, {
  route: "/api/triage/[id]",
  errorMessage: "Failed to save triage record",
  rateLimit: API_RATE_LIMITS.workspaceMutations,
});
