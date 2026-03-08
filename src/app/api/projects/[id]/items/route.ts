import { NextRequest, NextResponse } from "next/server";
import { addProjectItem, removeProjectItem, updateProjectItem } from "@/lib/projects-store";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";

export const POST = withRouteProtection(async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const cveId = typeof body?.cveId === "string" ? body.cveId.trim() : "";
  const note = typeof body?.note === "string" ? body.note : "";

  if (!cveId) {
    return applyWorkspaceSession(NextResponse.json({ error: "cveId is required" }, { status: 400 }), session);
  }

  const project = await addProjectItem(session.userId, id, { cveId, note });
  if (!project) {
    return applyWorkspaceSession(NextResponse.json({ error: "Project not found" }, { status: 404 }), session);
  }

  return applyWorkspaceSession(NextResponse.json(project), session);
}, {
  route: "/api/projects/[id]/items",
  errorMessage: "Failed to add project item",
  rateLimit: API_RATE_LIMITS.projectMutations,
});

export const DELETE = withRouteProtection(async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const cveId = typeof body?.cveId === "string" ? body.cveId.trim() : "";

  if (!cveId) {
    return applyWorkspaceSession(NextResponse.json({ error: "cveId is required" }, { status: 400 }), session);
  }

  const project = await removeProjectItem(session.userId, id, cveId);
  if (!project) {
    return applyWorkspaceSession(NextResponse.json({ error: "Project not found" }, { status: 404 }), session);
  }

  return applyWorkspaceSession(NextResponse.json(project), session);
}, {
  route: "/api/projects/[id]/items",
  errorMessage: "Failed to remove project item",
  rateLimit: API_RATE_LIMITS.projectMutations,
});

export const PATCH = withRouteProtection(async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = getOrCreateWorkspaceSession(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const cveId = typeof body?.cveId === "string" ? body.cveId.trim() : "";

  if (!cveId) {
    return applyWorkspaceSession(NextResponse.json({ error: "cveId is required" }, { status: 400 }), session);
  }

  const project = await updateProjectItem(session.userId, id, cveId, {
    note: typeof body?.note === "string" ? body.note : undefined,
    owner: typeof body?.owner === "string" ? body.owner : undefined,
    remediationState: typeof body?.remediationState === "string"
      ? body.remediationState as "not_started" | "planned" | "in_progress" | "validated" | "deferred" | "exception"
      : undefined,
    slaDueAt: typeof body?.slaDueAt === "string" || body?.slaDueAt === null ? body.slaDueAt : undefined,
    exception: body?.exception && typeof body.exception === "object"
      ? {
          reason: typeof body.exception.reason === "string" ? body.exception.reason : "",
          approvedBy: typeof body.exception.approvedBy === "string" ? body.exception.approvedBy : "",
          expiresAt: typeof body.exception.expiresAt === "string" || body.exception.expiresAt === null ? body.exception.expiresAt : null,
          notes: typeof body.exception.notes === "string" ? body.exception.notes : "",
        }
      : body?.exception === null
        ? null
        : undefined,
  });

  if (!project) {
    return applyWorkspaceSession(NextResponse.json({ error: "Project or item not found" }, { status: 404 }), session);
  }

  return applyWorkspaceSession(NextResponse.json(project), session);
}, {
  route: "/api/projects/[id]/items",
  errorMessage: "Failed to update project item",
  rateLimit: API_RATE_LIMITS.projectMutations,
});
