import { AuditLogEntry, ProjectItem, ProjectRecord } from "./types";
import { getDb, withTransaction } from "./db";
import { WorkspaceImportMode } from "./workspace-types";

const MAX_ACTIVITY_ENTRIES = 20;

export async function listProjects(): Promise<ProjectRecord[]> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, description, created_at as createdAt, updated_at as updatedAt
    FROM projects
    ORDER BY updated_at DESC
  `).all() as ProjectRow[];

  return rows.map((row) => buildProjectRecord(row, db));
}

export async function createProject(input: {
  name: string;
  description?: string;
}): Promise<ProjectRecord> {
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

  withTransaction((db) => {
    db.prepare(`
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(project.id, project.name, project.description, project.createdAt, project.updatedAt);

    db.prepare(`
      INSERT INTO project_activity (id, project_id, action, summary, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(project.activity[0].id, project.id, project.activity[0].action, project.activity[0].summary, project.activity[0].createdAt);
  });

  return project;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const result = getDb().prepare("DELETE FROM projects WHERE id = ?").run(projectId);
  return result.changes > 0;
}

export async function getProjectById(projectId: string): Promise<ProjectRecord | null> {
  return getProjectRecord(projectId);
}

export async function addProjectItem(projectId: string, item: { cveId: string; note?: string }): Promise<ProjectRecord | null> {
  return withTransaction((db) => {
    const project = getProjectRecord(projectId, db);
    if (!project) return null;

    const existing = project.items.find((entry) => entry.cveId === item.cveId);
    const now = new Date().toISOString();
    const note = item.note?.trim() ?? "";

    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now, projectId);

    db.prepare(`
      INSERT INTO project_items (project_id, cve_id, note, added_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(project_id, cve_id) DO UPDATE SET note = excluded.note
    `).run(projectId, item.cveId, note || existing?.note || "", existing?.addedAt || now);

    const summary = existing
      ? note && note !== existing.note
        ? `Updated note for ${item.cveId}`
        : `Refreshed ${item.cveId} in project`
      : `Added ${item.cveId} to project`;

    appendProjectActivity(projectId, createActivityEntry(existing ? "project_item_updated" : "project_item_added", summary, now), db);

    return getProjectRecord(projectId, db);
  });
}

export async function removeProjectItem(projectId: string, cveId: string): Promise<ProjectRecord | null> {
  return withTransaction((db) => {
    const project = getProjectRecord(projectId, db);
    if (!project) return null;

    const now = new Date().toISOString();
    db.prepare("DELETE FROM project_items WHERE project_id = ? AND cve_id = ?").run(projectId, cveId);
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now, projectId);
    appendProjectActivity(projectId, createActivityEntry("project_item_removed", `Removed ${cveId} from project`, now), db);
    return getProjectRecord(projectId, db);
  });
}

export function normalizeProjectName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 80);
}

export async function importProjects(projects: ProjectRecord[], mode: WorkspaceImportMode): Promise<void> {
  withTransaction((db) => {
    if (mode === "replace") {
      db.prepare("DELETE FROM projects").run();
    }

    const upsertProject = db.prepare(`
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `);
    const insertItem = db.prepare(`
      INSERT INTO project_items (project_id, cve_id, note, added_at)
      VALUES (?, ?, ?, ?)
    `);
    const insertActivity = db.prepare(`
      INSERT INTO project_activity (id, project_id, action, summary, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const project of projects) {
      const projectId = project.id || crypto.randomUUID();
      upsertProject.run(
        projectId,
        normalizeProjectName(project.name) || "Imported project",
        project.description ?? "",
        project.createdAt || new Date().toISOString(),
        project.updatedAt || new Date().toISOString()
      );

      db.prepare("DELETE FROM project_items WHERE project_id = ?").run(projectId);
      db.prepare("DELETE FROM project_activity WHERE project_id = ?").run(projectId);

      for (const item of project.items) {
        insertItem.run(
          projectId,
          item.cveId,
          item.note ?? "",
          item.addedAt || new Date().toISOString()
        );
      }

      const activity = project.activity.length > 0
        ? project.activity.slice(0, MAX_ACTIVITY_ENTRIES)
        : [createActivityEntry("project_imported", `Imported project ${project.name}`, project.updatedAt || new Date().toISOString())];

      for (const entry of activity) {
        insertActivity.run(
          entry.id || crypto.randomUUID(),
          projectId,
          entry.action,
          entry.summary,
          entry.createdAt || new Date().toISOString()
        );
      }
    }
  });
}

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

function getProjectRecord(projectId: string, db = getDb()): ProjectRecord | null {
  const row = db.prepare(`
    SELECT id, name, description, created_at as createdAt, updated_at as updatedAt
    FROM projects
    WHERE id = ?
  `).get(projectId) as ProjectRow | undefined;

  if (!row) {
    return null;
  }

  return buildProjectRecord(row, db);
}

function buildProjectRecord(row: ProjectRow, db = getDb()): ProjectRecord {
  const items = db.prepare(`
    SELECT cve_id as cveId, note, added_at as addedAt
    FROM project_items
    WHERE project_id = ?
    ORDER BY added_at DESC
  `).all(row.id) as ProjectItem[];

  const activity = db.prepare(`
    SELECT id, action, summary, created_at as createdAt
    FROM project_activity
    WHERE project_id = ?
    ORDER BY created_at DESC, rowid DESC
    LIMIT ?
  `).all(row.id, MAX_ACTIVITY_ENTRIES) as AuditLogEntry[];

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items,
    activity,
  };
}

function createActivityEntry(action: string, summary: string, createdAt: string): AuditLogEntry {
  return {
    id: crypto.randomUUID(),
    action,
    summary,
    createdAt,
  };
}

function appendProjectActivity(projectId: string, entry: AuditLogEntry, db = getDb()): void {
  db.prepare(`
    INSERT INTO project_activity (id, project_id, action, summary, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(entry.id, projectId, entry.action, entry.summary, entry.createdAt);

  const extraRows = db.prepare(`
    SELECT id
    FROM project_activity
    WHERE project_id = ?
    ORDER BY created_at DESC, rowid DESC
    LIMIT -1 OFFSET ?
  `).all(projectId, MAX_ACTIVITY_ENTRIES) as Array<{ id: string }>;

  for (const row of extraRows) {
    db.prepare("DELETE FROM project_activity WHERE id = ?").run(row.id);
  }
}
