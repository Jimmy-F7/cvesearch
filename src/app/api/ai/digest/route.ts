import { NextRequest, NextResponse } from "next/server";
import { generateDigest } from "@/lib/ai-service";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { getAICacheEntry, setAICacheEntry } from "@/lib/ai-cache-store";

export const POST = withRouteProtection(async function POST(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const body = await request.json().catch(() => null);
  const regenerate = body?.regenerate === true;

  if (!regenerate) {
    const cached = getAICacheEntry(session.userId, "daily_digest", "");
    if (cached) {
      const data = JSON.parse(cached.outputJson);
      return applyWorkspaceSession(NextResponse.json({ ...data, _cachedAt: cached.createdAt }), session);
    }
  }

  const digest = await generateDigest({
    watchlist: Array.isArray(body?.watchlist) ? body.watchlist : [],
    alerts: Array.isArray(body?.alerts) ? body.alerts : [],
    projects: Array.isArray(body?.projects) ? body.projects : [],
  }, { userId: session.userId });

  setAICacheEntry(session.userId, "daily_digest", "", JSON.stringify(digest));
  return applyWorkspaceSession(NextResponse.json(digest), session);
}, {
  route: "/api/ai/digest",
  errorMessage: "Failed to generate digest",
  rateLimit: API_RATE_LIMITS.aiWrite,
});
