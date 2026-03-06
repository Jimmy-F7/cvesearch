import { promises as fs } from "node:fs";
import path from "node:path";
import { AuditLogEntry, ProjectItem, ProjectRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const MAX_ACTIVITY_ENTRIES = 20;

function getProjectsFile(): string {
  return process.env.PROJECTS_FILE?.trim() || path.join(DATA_DIR, "projects.json");
}

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
    activity: [createActivityEntry("project_created", `Created project ${normalizeProjectName(input.name)}`, now)],
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
  const note = item.note?.trim() ?? "";
  const exists = project.items.some((entry) => entry.cveId === item.cveId);
  const nextItems: ProjectItem[] = exists
    ? project.items.map((entry) =>
        entry.cveId === item.cveId ? { ...entry, note: note || entry.note, addedAt: entry.addedAt } : entry
      )
    : [{ cveId: item.cveId, note, addedAt: now }, ...project.items];

  const summary = exists
    ? note && note !== project.items.find((entry) => entry.cveId === item.cveId)?.note
      ? `Updated note for ${item.cveId}`
      : `Refreshed ${item.cveId} in project`
    : `Added ${item.cveId} to project`;

  const updated: ProjectRecord = {
    ...project,
    items: nextItems,
    updatedAt: now,
    activity: appendActivity(project.activity, createActivityEntry(exists ? "project_item_updated" : "project_item_added", summary, now)),
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
  const now = new Date().toISOString();
  const updated: ProjectRecord = {
    ...project,
    items: nextItems,
    updatedAt: now,
    activity: appendActivity(project.activity, createActivityEntry("project_item_removed", `Removed ${cveId} from project`, now)),
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
    const raw = await fs.readFile(getProjectsFile(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isProjectRecord).map(normalizeProjectRecord) : [];
  } catch {
    return [];
  }
}

async function writeProjects(projects: ProjectRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(getProjectsFile(), JSON.stringify(projects, null, 2));
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

function normalizeProjectRecord(record: ProjectRecord): ProjectRecord {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    items: Array.isArray(record.items) ? record.items.filter(isProjectItem) : [],
    activity: Array.isArray(record.activity) ? record.activity.filter(isAuditLogEntry).slice(0, MAX_ACTIVITY_ENTRIES) : [],
  };
}

function isProjectItem(value: unknown): value is ProjectItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.cveId === "string" && typeof record.addedAt === "string" && (typeof record.note === "string" || record.note === undefined);
}

function isAuditLogEntry(value: unknown): value is AuditLogEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.action === "string" &&
    typeof record.summary === "string" &&
    typeof record.createdAt === "string"
  );
}

function createActivityEntry(action: string, summary: string, createdAt: string): AuditLogEntry {
  return {
    id: crypto.randomUUID(),
    action,
    summary,
    createdAt,
  };
}

function appendActivity(activity: AuditLogEntry[], entry: AuditLogEntry): AuditLogEntry[] {
  return [entry, ...activity].slice(0, MAX_ACTIVITY_ENTRIES);
}
