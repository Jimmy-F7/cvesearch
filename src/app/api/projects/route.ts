import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects, normalizeProjectName } from "@/lib/projects-store";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";

export const GET = withRouteProtection(async function GET(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const projects = await listProjects(session.userId);
  return applyWorkspaceSession(NextResponse.json(projects), session);
}, {
  route: "/api/projects",
  errorMessage: "Failed to load projects",
  rateLimit: API_RATE_LIMITS.projectReads,
});

export const POST = withRouteProtection(async function POST(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? normalizeProjectName(body.name) : "";
  const description = typeof body?.description === "string" ? body.description : "";

  if (!name) {
    return applyWorkspaceSession(NextResponse.json({ error: "Project name is required" }, { status: 400 }), session);
  }

  const project = await createProject(session.userId, { name, description });
  return applyWorkspaceSession(NextResponse.json(project, { status: 201 }), session);
}, {
  route: "/api/projects",
  errorMessage: "Failed to create project",
  rateLimit: API_RATE_LIMITS.projectMutations,
});
