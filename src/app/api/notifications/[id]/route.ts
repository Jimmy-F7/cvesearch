import { NextRequest, NextResponse } from "next/server";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import {
  deleteNotificationPreferenceForUser,
  updateNotificationPreferenceForUser,
} from "@/lib/notifications-store";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";

export const PATCH = withRouteProtection(async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  const preference = await updateNotificationPreferenceForUser(session.userId, id, {
    teamName: typeof body?.teamName === "string" ? body.teamName : undefined,
    channel: typeof body?.channel === "string" ? body.channel as "in_app" | "email" | "slack" | "webhook" : undefined,
    destination: typeof body?.destination === "string" ? body.destination : undefined,
    cadence: typeof body?.cadence === "string" ? body.cadence as "daily" | "weekly" : undefined,
    enabled: typeof body?.enabled === "boolean" ? body.enabled : undefined,
  });

  if (!preference) {
    return NextResponse.json({ error: "Notification schedule not found" }, { status: 404 });
  }

  return applyWorkspaceSession(NextResponse.json(preference), session);
}, {
  route: "/api/notifications/[id]",
  errorMessage: "Failed to update notification schedule",
  rateLimit: API_RATE_LIMITS.workspaceMutations,
});

export const DELETE = withRouteProtection(async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const success = await deleteNotificationPreferenceForUser(session.userId, id);

  if (!success) {
    return NextResponse.json({ error: "Notification schedule not found" }, { status: 404 });
  }

  return applyWorkspaceSession(NextResponse.json({ success: true }), session);
}, {
  route: "/api/notifications/[id]",
  errorMessage: "Failed to delete notification schedule",
  rateLimit: API_RATE_LIMITS.workspaceMutations,
});
