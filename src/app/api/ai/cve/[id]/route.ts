import { NextRequest, NextResponse } from "next/server";
import { getCVEByIdServer, getEPSSServer } from "@/lib/server-api";
import { listProjects } from "@/lib/projects-store";
import { generateCveInsight } from "@/lib/ai-service";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { readTriageRecordForUser } from "@/lib/workspace-store";

export const POST = withRouteProtection(async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const detail = await getCVEByIdServer(decodeURIComponent(id));
  const [epss, projects] = await Promise.all([getEPSSServer(detail.id), listProjects()]);
  const relatedProjects = projects.filter((project) => project.items.some((item) => item.cveId === detail.id));
  const triage = body?.triage && typeof body.triage === "object"
    ? body.triage
    : await readTriageRecordForUser(session.userId, detail.id);
  const insight = await generateCveInsight({
    detail,
    epss,
    triage,
    relatedProjects: relatedProjects.map((project) => ({
      name: project.name,
      items: project.items,
      updatedAt: project.updatedAt,
    })),
  });
  return applyWorkspaceSession(NextResponse.json(insight), session);
}, {
  route: "/api/ai/cve/[id]",
  errorMessage: "Failed to generate AI CVE insight",
  rateLimit: API_RATE_LIMITS.aiWrite,
});
