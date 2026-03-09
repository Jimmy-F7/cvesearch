import { NextRequest, NextResponse } from "next/server";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { loadAlertEvaluationsForUser } from "@/lib/workspace-context";

export const GET = withRouteProtection(async function GET(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const response = NextResponse.json(await loadAlertEvaluationsForUser(session.userId));
  return applyWorkspaceSession(response, session);
}, {
  route: "/api/alerts/evaluations",
  errorMessage: "Failed to load alert evaluations",
  rateLimit: API_RATE_LIMITS.workspaceReads,
});
