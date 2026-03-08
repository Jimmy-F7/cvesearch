import { NextRequest, NextResponse } from "next/server";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { deleteAlertRuleForUser, markAlertRuleCheckedForUser } from "@/lib/workspace-store";

export const DELETE = withRouteProtection(async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const deleted = await deleteAlertRuleForUser(session.userId, decodeURIComponent(id));
  const response = deleted
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: "Alert rule not found" }, { status: 404 });
  return applyWorkspaceSession(response, session);
}, {
  route: "/api/alerts/[id]",
  errorMessage: "Failed to delete alert rule",
  rateLimit: API_RATE_LIMITS.workspaceMutations,
});

export const PATCH = withRouteProtection(async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const response = NextResponse.json(await markAlertRuleCheckedForUser(session.userId, decodeURIComponent(id)));
  return applyWorkspaceSession(response, session);
}, {
  route: "/api/alerts/[id]",
  errorMessage: "Failed to update alert rule",
  rateLimit: API_RATE_LIMITS.workspaceMutations,
});
