import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects, normalizeProjectName } from "@/lib/projects-store";

export async function GET() {
  const projects = await listProjects();
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? normalizeProjectName(body.name) : "";
  const description = typeof body?.description === "string" ? body.description : "";

  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  const project = await createProject({ name, description });
  return NextResponse.json(project, { status: 201 });
}
