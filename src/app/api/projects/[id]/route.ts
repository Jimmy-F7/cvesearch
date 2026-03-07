import { NextRequest, NextResponse } from "next/server";
import { deleteProject, updateProject } from "@/lib/projects-store";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";

export const DELETE = withRouteProtection(async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const success = await deleteProject(id);

  if (!success) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}, {
  route: "/api/projects/[id]",
  errorMessage: "Failed to delete project",
  rateLimit: API_RATE_LIMITS.projectMutations,
});

export const PATCH = withRouteProtection(async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const project = await updateProject(id, {
    name: typeof body?.name === "string" ? body.name : undefined,
    description: typeof body?.description === "string" ? body.description : undefined,
    owner: typeof body?.owner === "string" ? body.owner : undefined,
    dueAt: typeof body?.dueAt === "string" || body?.dueAt === null ? body.dueAt : undefined,
    labels: Array.isArray(body?.labels) ? body.labels.filter((item: unknown): item is string => typeof item === "string") : undefined,
    status: typeof body?.status === "string" ? body.status as "planned" | "active" | "at_risk" | "done" : undefined,
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}, {
  route: "/api/projects/[id]",
  errorMessage: "Failed to update project",
  rateLimit: API_RATE_LIMITS.projectMutations,
});
