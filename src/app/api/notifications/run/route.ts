import { NextRequest, NextResponse } from "next/server";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { runDueNotificationDigestsForUser } from "@/lib/notifications-store";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";

export const POST = withRouteProtection(async function POST(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const body = await request.json().catch(() => null);
  const deliveries = await runDueNotificationDigestsForUser(session.userId, {
    force: true,
    preview: body?.preview === true,
    preferenceId: typeof body?.preferenceId === "string" ? body.preferenceId : undefined,
  });

  return applyWorkspaceSession(NextResponse.json(deliveries), session);
}, {
  route: "/api/notifications/run",
  errorMessage: "Failed to run notification digests",
  rateLimit: API_RATE_LIMITS.workspaceMutations,
});
