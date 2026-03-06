import { NextRequest, NextResponse } from "next/server";
import { getCVEByIdServer, getEPSSServer } from "@/lib/server-api";
import { listProjects } from "@/lib/projects-store";
import { generateCveInsight } from "@/lib/ai-service";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const detail = await getCVEByIdServer(decodeURIComponent(id));
    const [epss, projects] = await Promise.all([getEPSSServer(detail.id), listProjects()]);
    const relatedProjects = projects.filter((project) => project.items.some((item) => item.cveId === detail.id));
    const insight = await generateCveInsight({
      detail,
      epss,
      triage: body?.triage && typeof body.triage === "object" ? body.triage : null,
      relatedProjects: relatedProjects.map((project) => ({
        name: project.name,
        items: project.items,
        updatedAt: project.updatedAt,
      })),
    });
    return NextResponse.json(insight);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate AI CVE insight" },
      { status: 500 }
    );
  }
}
