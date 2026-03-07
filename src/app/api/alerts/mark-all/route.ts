import { NextRequest, NextResponse } from "next/server";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { markAllAlertRulesCheckedForUser } from "@/lib/workspace-store";

export const POST = withRouteProtection(async function POST(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const response = NextResponse.json(await markAllAlertRulesCheckedForUser(session.userId));
  return applyWorkspaceSession(response, session);
}, {
  route: "/api/alerts/mark-all",
  errorMessage: "Failed to mark alerts as checked",
  rateLimit: API_RATE_LIMITS.workspaceMutations,
});
