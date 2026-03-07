import { NextRequest, NextResponse } from "next/server";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { normalizeSearchState } from "@/lib/search";
import { createSavedViewForUser, listSavedViewsForUser } from "@/lib/workspace-store";

export const GET = withRouteProtection(async function GET(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const response = NextResponse.json(await listSavedViewsForUser(session.userId));
  return applyWorkspaceSession(response, session);
}, {
  route: "/api/saved-views",
  errorMessage: "Failed to load saved views",
  rateLimit: API_RATE_LIMITS.workspaceReads,
});

export const POST = withRouteProtection(async function POST(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name || !body?.search || typeof body.search !== "object") {
    return applyWorkspaceSession(NextResponse.json({ error: "name and search are required" }, { status: 400 }), session);
  }

  const response = NextResponse.json(await createSavedViewForUser(session.userId, name, normalizeSearchState(body.search)));
  return applyWorkspaceSession(response, session);
}, {
  route: "/api/saved-views",
  errorMessage: "Failed to create saved view",
  rateLimit: API_RATE_LIMITS.workspaceMutations,
});
