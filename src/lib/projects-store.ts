import { promises as fs } from "node:fs";
import path from "node:path";
import { ProjectItem, ProjectRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");

export async function listProjects(): Promise<ProjectRecord[]> {
  const projects = await readProjects();
  return projects.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function createProject(input: {
  name: string;
  description?: string;
}): Promise<ProjectRecord> {
  const projects = await readProjects();
  const now = new Date().toISOString();
  const project: ProjectRecord = {
    id: crypto.randomUUID(),
    name: normalizeProjectName(input.name),
    description: input.description?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
    items: [],
  };

  projects.push(project);
  await writeProjects(projects);
  return project;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const projects = await readProjects();
  const next = projects.filter((project) => project.id !== projectId);
  if (next.length === projects.length) return false;
  await writeProjects(next);
  return true;
}

export async function addProjectItem(projectId: string, item: { cveId: string; note?: string }): Promise<ProjectRecord | null> {
  const projects = await readProjects();
  const index = projects.findIndex((project) => project.id === projectId);
  if (index === -1) return null;

  const project = projects[index];
  const now = new Date().toISOString();
  const exists = project.items.some((entry) => entry.cveId === item.cveId);
  const nextItems: ProjectItem[] = exists
    ? project.items.map((entry) =>
        entry.cveId === item.cveId ? { ...entry, note: item.note ?? entry.note, addedAt: entry.addedAt } : entry
      )
    : [{ cveId: item.cveId, note: item.note?.trim() ?? "", addedAt: now }, ...project.items];

  const updated: ProjectRecord = {
    ...project,
    items: nextItems,
    updatedAt: now,
  };
  projects[index] = updated;
  await writeProjects(projects);
  return updated;
}

export async function removeProjectItem(projectId: string, cveId: string): Promise<ProjectRecord | null> {
  const projects = await readProjects();
  const index = projects.findIndex((project) => project.id === projectId);
  if (index === -1) return null;

  const project = projects[index];
  const nextItems = project.items.filter((item) => item.cveId !== cveId);
  const updated: ProjectRecord = {
    ...project,
    items: nextItems,
    updatedAt: new Date().toISOString(),
  };
  projects[index] = updated;
  await writeProjects(projects);
  return updated;
}

export function normalizeProjectName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 80);
}

async function readProjects(): Promise<ProjectRecord[]> {
  try {
    const raw = await fs.readFile(PROJECTS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isProjectRecord) : [];
  } catch {
    return [];
  }
}

async function writeProjects(projects: ProjectRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

function isProjectRecord(value: unknown): value is ProjectRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;

  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.description === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    Array.isArray(record.items)
  );
}
