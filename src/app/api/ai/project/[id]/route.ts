import { NextRequest, NextResponse } from "next/server";
import { generateProjectSummary } from "@/lib/ai-service";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { getProjectById } from "@/lib/projects-store";
import { getCVEByIdServer } from "@/lib/server-api";
import { readTriageMapForUser } from "@/lib/workspace-store";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { extractDescription, extractCVEId, getSeverityFromScore } from "@/lib/utils";

export const POST = withRouteProtection(async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const project = await getProjectById(id);

  if (!project) {
    return applyWorkspaceSession(NextResponse.json({ error: "Project not found" }, { status: 404 }), session);
  }

  const triageMap = await readTriageMapForUser(session.userId);
  const details = await Promise.all(
    project.items.map(async (item) => {
      try {
        return await getCVEByIdServer(item.cveId);
      } catch {
        return null;
      }
    })
  );

  const summary = await generateProjectSummary({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      updatedAt: project.updatedAt,
      items: project.items,
      activity: project.activity,
    },
    items: details.flatMap((detail) => {
      if (!detail) {
        return [];
      }

      const cveId = extractCVEId(detail);
      const triage = triageMap[cveId];
      const affectedProducts = detail.containers?.cna?.affected
        ?.flatMap((item) => [item.product, item.vendor].filter((value): value is string => Boolean(value))) ?? [];

      return [{
        id: cveId,
        summary: extractDescription(detail),
        severity: getSeverityFromScore(detail.cvss3 ?? detail.cvss),
        kev: Boolean(detail.kev),
        triageStatus: triage?.status ?? "new",
        owner: triage?.owner ?? "",
        affectedProducts: Array.from(new Set(affectedProducts)).slice(0, 6),
        published: detail.cveMetadata?.datePublished || detail.published || "",
      }];
    }),
  });

  return applyWorkspaceSession(NextResponse.json(summary), session);
}, {
  route: "/api/ai/project/[id]",
  errorMessage: "Failed to generate AI project summary",
  rateLimit: API_RATE_LIMITS.aiWrite,
});
