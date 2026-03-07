import { NextRequest, NextResponse } from "next/server";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { readTriageMapForUser } from "@/lib/workspace-store";

export const GET = withRouteProtection(async function GET(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const response = NextResponse.json(await readTriageMapForUser(session.userId));
  return applyWorkspaceSession(response, session);
}, {
  route: "/api/triage",
  errorMessage: "Failed to load triage records",
  rateLimit: API_RATE_LIMITS.workspaceReads,
});
