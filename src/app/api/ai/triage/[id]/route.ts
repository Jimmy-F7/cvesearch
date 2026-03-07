import { NextRequest, NextResponse } from "next/server";
import { generateTriageSuggestion } from "@/lib/ai-service";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { listProjects } from "@/lib/projects-store";
import { getCVEByIdServer, getEPSSServer } from "@/lib/server-api";
import { CVEDetail } from "@/lib/types";
import { readTriageRecordForUser } from "@/lib/workspace-store";

export const POST = withRouteProtection(async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const requestDetail = isCVEDetail(body?.detail) ? body.detail : null;
  const detail = await getCVEByIdServer(decodeURIComponent(id)).catch(() => requestDetail);

  if (!detail) {
    return applyWorkspaceSession(NextResponse.json({ error: "Failed to load CVE detail for AI triage" }, { status: 502 }), session);
  }

  const [epss, projects] = await Promise.all([
    getEPSSServer(detail.id).catch(() => null),
    listProjects().catch(() => []),
  ]);
  const triage = body?.triage && typeof body.triage === "object"
    ? body.triage
    : await readTriageRecordForUser(session.userId, detail.id);
  const relatedProjects = projects.filter((project) => project.items.some((item) => item.cveId === detail.id));
  const suggestion = await generateTriageSuggestion({
    detail,
    epss,
    triage,
    relatedProjects: relatedProjects.map((project) => ({
      name: project.name,
      items: project.items,
      updatedAt: project.updatedAt,
    })),
  });

  return applyWorkspaceSession(NextResponse.json(suggestion), session);
}, {
  route: "/api/ai/triage/[id]",
  errorMessage: "Failed to generate AI triage suggestion",
  rateLimit: API_RATE_LIMITS.aiWrite,
});

function isCVEDetail(value: unknown): value is CVEDetail {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && typeof (value as Record<string, unknown>).id === "string";
}
