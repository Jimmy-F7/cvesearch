import { NextRequest, NextResponse } from "next/server";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { getWorkspaceConversationForUser } from "@/lib/workspace-assistant-store";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";

export const GET = withRouteProtection(async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const conversation = await getWorkspaceConversationForUser(session.userId, id);

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return applyWorkspaceSession(NextResponse.json(conversation), session);
}, {
  route: "/api/workspace/conversations/[id]",
  errorMessage: "Failed to load workspace conversation",
  rateLimit: API_RATE_LIMITS.workspaceReads,
});
