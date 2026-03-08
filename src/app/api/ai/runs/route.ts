import { NextRequest, NextResponse } from "next/server";
import { clearRecentAIRuns, deleteRecentAIRun, getRecentAIRuns } from "@/lib/ai-service";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";

export const GET = withRouteProtection(async function GET(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const rawLimit = request.nextUrl.searchParams.get("limit");
  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : 25;
  const runs = await getRecentAIRuns(session.userId, limit);
  return applyWorkspaceSession(NextResponse.json(runs), session);
}, {
  route: "/api/ai/runs",
  errorMessage: "Failed to load AI runs",
  rateLimit: API_RATE_LIMITS.aiRead,
});

export const DELETE = withRouteProtection(async function DELETE(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const id = request.nextUrl.searchParams.get("id")?.trim();

  if (id) {
    const deleted = await deleteRecentAIRun(session.userId, id);
    return applyWorkspaceSession(NextResponse.json({ deleted }), session);
  }

  const deletedCount = await clearRecentAIRuns(session.userId);
  return applyWorkspaceSession(NextResponse.json({ deletedCount }), session);
}, {
  route: "/api/ai/runs",
  errorMessage: "Failed to delete AI runs",
  rateLimit: API_RATE_LIMITS.aiWrite,
});
