import { NextRequest, NextResponse } from "next/server";
import { deleteProject, updateProject } from "@/lib/projects-store";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";

export const DELETE = withRouteProtection(async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const success = await deleteProject(session.userId, id);

  if (!success) {
    return applyWorkspaceSession(NextResponse.json({ error: "Project not found" }, { status: 404 }), session);
  }

  return applyWorkspaceSession(NextResponse.json({ success: true }), session);
}, {
  route: "/api/projects/[id]",
  errorMessage: "Failed to delete project",
  rateLimit: API_RATE_LIMITS.projectMutations,
});

export const PATCH = withRouteProtection(async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const project = await updateProject(session.userId, id, {
    name: typeof body?.name === "string" ? body.name : undefined,
    description: typeof body?.description === "string" ? body.description : undefined,
    owner: typeof body?.owner === "string" ? body.owner : undefined,
    dueAt: typeof body?.dueAt === "string" || body?.dueAt === null ? body.dueAt : undefined,
    labels: Array.isArray(body?.labels) ? body.labels.filter((item: unknown): item is string => typeof item === "string") : undefined,
    status: typeof body?.status === "string" ? body.status as "planned" | "active" | "at_risk" | "done" : undefined,
  });

  if (!project) {
    return applyWorkspaceSession(NextResponse.json({ error: "Project not found" }, { status: 404 }), session);
  }

  return applyWorkspaceSession(NextResponse.json(project), session);
}, {
  route: "/api/projects/[id]",
  errorMessage: "Failed to update project",
  rateLimit: API_RATE_LIMITS.projectMutations,
});
