import { NextRequest, NextResponse } from "next/server";
import { generateSearchInterpretation } from "@/lib/ai-service";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";

export const POST = withRouteProtection(async function POST(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";

  if (!prompt.trim()) {
    return applyWorkspaceSession(NextResponse.json({ error: "prompt is required" }, { status: 400 }), session);
  }

  const interpretation = await generateSearchInterpretation(prompt, { userId: session.userId });
  return applyWorkspaceSession(NextResponse.json(interpretation), session);
}, {
  route: "/api/ai/search",
  errorMessage: "Failed to interpret search prompt",
  rateLimit: API_RATE_LIMITS.aiWrite,
});
