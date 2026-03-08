import { NextRequest, NextResponse } from "next/server";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { buildUserWorkspaceMessage, answerWorkspaceQuestion } from "@/lib/workspace-assistant";
import {
  appendWorkspaceConversationMessages,
  createWorkspaceConversationForUser,
  listWorkspaceConversationsForUser,
} from "@/lib/workspace-assistant-store";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";

export const GET = withRouteProtection(async function GET(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const conversations = await listWorkspaceConversationsForUser(session.userId);
  return applyWorkspaceSession(NextResponse.json(conversations), session);
}, {
  route: "/api/workspace/conversations",
  errorMessage: "Failed to load workspace conversations",
  rateLimit: API_RATE_LIMITS.workspaceReads,
});

export const POST = withRouteProtection(async function POST(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : prompt.slice(0, 48);
  const conversation = await createWorkspaceConversationForUser(session.userId, title || "Workspace conversation");

  if (!prompt) {
    return applyWorkspaceSession(NextResponse.json(conversation, { status: 201 }), session);
  }

  const userMessage = buildUserWorkspaceMessage(prompt);
  const assistant = await answerWorkspaceQuestion(prompt, session.userId);
  const updated = await appendWorkspaceConversationMessages(session.userId, conversation.id, [userMessage, assistant.message]);

  return applyWorkspaceSession(NextResponse.json(updated ?? conversation, { status: 201 }), session);
}, {
  route: "/api/workspace/conversations",
  errorMessage: "Failed to create workspace conversation",
  rateLimit: API_RATE_LIMITS.workspaceMutations,
});
