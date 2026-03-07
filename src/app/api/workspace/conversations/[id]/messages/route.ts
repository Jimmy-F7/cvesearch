import { NextRequest, NextResponse } from "next/server";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { buildUserWorkspaceMessage, answerWorkspaceQuestion } from "@/lib/workspace-assistant";
import { appendWorkspaceConversationMessages } from "@/lib/workspace-assistant-store";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";

export const POST = withRouteProtection(async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const userMessage = buildUserWorkspaceMessage(prompt);
  const assistant = await answerWorkspaceQuestion(prompt, session.userId);
  const conversation = await appendWorkspaceConversationMessages(session.userId, id, [userMessage, assistant.message]);

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return applyWorkspaceSession(NextResponse.json(conversation), session);
}, {
  route: "/api/workspace/conversations/[id]/messages",
  errorMessage: "Failed to append workspace conversation message",
  rateLimit: API_RATE_LIMITS.workspaceMutations,
});
