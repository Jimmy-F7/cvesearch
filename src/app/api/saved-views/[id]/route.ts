import { NextRequest, NextResponse } from "next/server";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { deleteSavedViewForUser } from "@/lib/workspace-store";

export const DELETE = withRouteProtection(async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const deleted = await deleteSavedViewForUser(session.userId, decodeURIComponent(id));
  const response = deleted
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: "Saved view not found" }, { status: 404 });
  return applyWorkspaceSession(response, session);
}, {
  route: "/api/saved-views/[id]",
  errorMessage: "Failed to delete saved view",
  rateLimit: API_RATE_LIMITS.workspaceMutations,
});
