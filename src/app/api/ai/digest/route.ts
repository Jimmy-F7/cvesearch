import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { generateDigest } from "@/lib/ai-service";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { clearAICacheForUserFeature, getAICacheEntry, setAICacheEntry } from "@/lib/ai-cache-store";
import { buildDigestInputFromWorkspaceSnapshot, loadWorkspaceContextSnapshot } from "@/lib/workspace-context";

export const POST = withRouteProtection(async function POST(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const body = await request.json().catch(() => null);
  const regenerate = body?.regenerate === true;
  const snapshot = await loadWorkspaceContextSnapshot(session.userId);
  const digestInput = buildDigestInputFromWorkspaceSnapshot(snapshot);
  const digestKey = createHash("sha256").update(JSON.stringify(digestInput)).digest("hex");

  if (!regenerate) {
    const cached = getAICacheEntry(session.userId, "daily_digest", digestKey);
    if (cached) {
      const data = JSON.parse(cached.outputJson);
      return applyWorkspaceSession(NextResponse.json({ ...data, _cachedAt: cached.createdAt }), session);
    }
  }

  const digest = await generateDigest(digestInput, { userId: session.userId });

  clearAICacheForUserFeature(session.userId, "daily_digest");
  setAICacheEntry(session.userId, "daily_digest", digestKey, JSON.stringify(digest));
  return applyWorkspaceSession(NextResponse.json(digest), session);
}, {
  route: "/api/ai/digest",
  errorMessage: "Failed to generate digest",
  rateLimit: API_RATE_LIMITS.aiWrite,
});
