import { NextRequest, NextResponse } from "next/server";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";
import { generateExposureAssessment } from "@/lib/ai-service";
import { listProjects } from "@/lib/projects-store";
import { getCVEByIdServer } from "@/lib/server-api";
import { CVEDetail } from "@/lib/types";
import { listInventoryAssetsForUser, readTriageRecordForUser } from "@/lib/workspace-store";
import { getAICacheEntry, setAICacheEntry } from "@/lib/ai-cache-store";

export const POST = withRouteProtection(async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const regenerate = body?.regenerate === true;
  const decodedId = decodeURIComponent(id);

  if (!regenerate) {
    const cached = getAICacheEntry(session.userId, "exposure_agent", decodedId);
    if (cached) {
      const data = JSON.parse(cached.outputJson);
      return applyWorkspaceSession(NextResponse.json({ ...data, _cachedAt: cached.createdAt }), session);
    }
  }

  const requestDetail = isCVEDetail(body?.detail) ? body.detail : null;
  const detail = await getCVEByIdServer(decodedId).catch(() => requestDetail);

  if (!detail) {
    return applyWorkspaceSession(NextResponse.json({ error: "Failed to load CVE detail for AI exposure" }, { status: 502 }), session);
  }

  const [triage, inventoryAssets, projects] = await Promise.all([
    readTriageRecordForUser(session.userId, detail.id),
    listInventoryAssetsForUser(session.userId),
    listProjects(session.userId).catch(() => []),
  ]);
  const relatedProjects = projects.filter((project) => project.items.some((item) => item.cveId === detail.id));
  const assessment = await generateExposureAssessment({
    detail,
    triage,
    relatedProjects: relatedProjects.map((project) => ({
      name: project.name,
      items: project.items,
      updatedAt: project.updatedAt,
    })),
    inventoryAssets: inventoryAssets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      vendor: asset.vendor,
      product: asset.product,
      version: asset.version,
      environment: asset.environment,
      criticality: asset.criticality,
      notes: asset.notes,
    })),
  }, { userId: session.userId });

  setAICacheEntry(session.userId, "exposure_agent", decodedId, JSON.stringify(assessment));
  return applyWorkspaceSession(NextResponse.json(assessment), session);
}, {
  route: "/api/ai/exposure/[id]",
  errorMessage: "Failed to generate AI exposure assessment",
  rateLimit: API_RATE_LIMITS.aiWrite,
});

function isCVEDetail(value: unknown): value is CVEDetail {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && typeof (value as Record<string, unknown>).id === "string";
}
