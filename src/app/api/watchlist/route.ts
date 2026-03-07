import { NextRequest, NextResponse } from "next/server";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { listWatchlist, toggleWatchlistEntry } from "@/lib/workspace-store";

export const GET = withRouteProtection(async function GET(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const response = NextResponse.json(await listWatchlist(session.userId));
  return applyWorkspaceSession(response, session);
}, {
  route: "/api/watchlist",
  errorMessage: "Failed to load watchlist",
  rateLimit: API_RATE_LIMITS.workspaceReads,
});

export const POST = withRouteProtection(async function POST(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id.trim() : "";

  if (!id) {
    return applyWorkspaceSession(NextResponse.json({ error: "id is required" }, { status: 400 }), session);
  }

  const response = NextResponse.json(await toggleWatchlistEntry(session.userId, id));
  return applyWorkspaceSession(response, session);
}, {
  route: "/api/watchlist",
  errorMessage: "Failed to update watchlist",
  rateLimit: API_RATE_LIMITS.workspaceMutations,
});
