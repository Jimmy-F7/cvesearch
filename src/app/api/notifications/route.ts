import { NextRequest, NextResponse } from "next/server";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import {
  createNotificationPreferenceForUser,
  listNotificationDeliveriesForUser,
  listNotificationPreferencesForUser,
  runDueNotificationDigestsForUser,
} from "@/lib/notifications-store";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";

export const GET = withRouteProtection(async function GET(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  await runDueNotificationDigestsForUser(session.userId);
  const [preferences, deliveries] = await Promise.all([
    listNotificationPreferencesForUser(session.userId),
    listNotificationDeliveriesForUser(session.userId),
  ]);

  return applyWorkspaceSession(NextResponse.json({ preferences, deliveries }), session);
}, {
  route: "/api/notifications",
  errorMessage: "Failed to load notifications",
  rateLimit: API_RATE_LIMITS.workspaceReads,
});

export const POST = withRouteProtection(async function POST(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const body = await request.json().catch(() => null);
  const teamName = typeof body?.teamName === "string" ? body.teamName : "";
  const channel = typeof body?.channel === "string" ? body.channel : "in_app";
  const destination = typeof body?.destination === "string" ? body.destination : "";
  const cadence = typeof body?.cadence === "string" ? body.cadence : "daily";

  const preference = await createNotificationPreferenceForUser(session.userId, {
    teamName,
    channel: channel as "in_app" | "email" | "slack" | "webhook",
    destination,
    cadence: cadence as "daily" | "weekly",
  });

  return applyWorkspaceSession(NextResponse.json(preference, { status: 201 }), session);
}, {
  route: "/api/notifications",
  errorMessage: "Failed to create notification schedule",
  rateLimit: API_RATE_LIMITS.workspaceMutations,
});
