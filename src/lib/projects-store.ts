import {
  AuditLogEntry,
  ProjectExceptionRecord,
  ProjectItem,
  ProjectRecord,
  ProjectStatus,
  ProjectTimelineEvent,
  RemediationState,
} from "./types";
import { getDb, withTransaction } from "./db";
import { WorkspaceImportMode } from "./workspace-types";

const MAX_ACTIVITY_ENTRIES = 20;

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  owner: string;
  dueAt: string | null;
  labelsJson: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectItemRow {
  cveId: string;
  note: string;
  addedAt: string;
  owner: string;
  remediationState: string;
  slaDueAt: string | null;
  exceptionJson: string;
  updatedAt: string;
}

export async function listProjects(userId: string): Promise<ProjectRecord[]> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      id,
      name,
      description,
      owner,
      due_at as dueAt,
      labels_json as labelsJson,
      status,
      created_at as createdAt,
      updated_at as updatedAt
    FROM projects
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `).all(userId) as ProjectRow[];

  return rows.map((row) => buildProjectRecord(row, db));
}

export async function createProject(userId: string, input: {
  name: string;
  description?: string;
  owner?: string;
  dueAt?: string | null;
  labels?: string[];
  status?: ProjectStatus;
}): Promise<ProjectRecord> {
  const now = new Date().toISOString();
  const project: ProjectRecord = {
    id: crypto.randomUUID(),
    name: normalizeProjectName(input.name),
    description: input.description?.trim() ?? "",
    owner: input.owner?.trim() ?? "",
    dueAt: normalizeDate(input.dueAt),
    labels: normalizeLabels(input.labels),
    status: normalizeProjectStatus(input.status),
    createdAt: now,
    updatedAt: now,
    items: [],
    activity: [createActivityEntry("project_created", `Created project ${normalizeProjectName(input.name)}`, now)],
    timeline: [],
  };

  withTransaction((db) => {
    db.prepare(`
      INSERT INTO projects (id, user_id, name, description, owner, due_at, labels_json, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      project.id,
      userId,
      project.name,
      project.description,
      project.owner,
      project.dueAt,
      JSON.stringify(project.labels),
      project.status,
      project.createdAt,
      project.updatedAt
    );

    db.prepare(`
      INSERT INTO project_activity (id, project_id, action, summary, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(project.activity[0].id, project.id, project.activity[0].action, project.activity[0].summary, project.activity[0].createdAt);
  });

  return getProjectRecord(userId, project.id) as ProjectRecord;
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: Partial<Pick<ProjectRecord, "name" | "description" | "owner" | "dueAt" | "labels" | "status">>
): Promise<ProjectRecord | null> {
  return withTransaction((db) => {
    const current = getProjectRecord(userId, projectId, db);
    if (!current) {
      return null;
    }

    const now = new Date().toISOString();
    const next: ProjectRecord = {
      ...current,
      name: input.name ? normalizeProjectName(input.name) : current.name,
      description: typeof input.description === "string" ? input.description.trim() : current.description,
      owner: typeof input.owner === "string" ? input.owner.trim() : current.owner,
      dueAt: input.dueAt === undefined ? current.dueAt ?? null : normalizeDate(input.dueAt),
      labels: input.labels ? normalizeLabels(input.labels) : current.labels ?? [],
      status: input.status ? normalizeProjectStatus(input.status) : current.status ?? "active",
      updatedAt: now,
    };

    db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, owner = ?, due_at = ?, labels_json = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      next.name,
      next.description,
      next.owner,
      next.dueAt,
      JSON.stringify(next.labels ?? []),
      next.status,
      next.updatedAt,
      projectId
    );

    const changes = summarizeProjectChanges(current, next);
    if (changes.length > 0) {
      appendProjectActivity(projectId, createActivityEntry("project_updated", changes.join(" • "), now), db);
    }

    return getProjectRecord(userId, projectId, db);
  });
}

export async function deleteProject(userId: string, projectId: string): Promise<boolean> {
  const result = getDb().prepare("DELETE FROM projects WHERE user_id = ? AND id = ?").run(userId, projectId);
  return result.changes > 0;
}

export async function getProjectById(userId: string, projectId: string): Promise<ProjectRecord | null> {
  return getProjectRecord(userId, projectId);
}

export async function addProjectItem(
  userId: string,
  projectId: string,
  item: {
    cveId: string;
    note?: string;
    owner?: string;
    remediationState?: RemediationState;
    slaDueAt?: string | null;
    exception?: ProjectExceptionRecord | null;
  }
): Promise<ProjectRecord | null> {
  return withTransaction((db) => {
    const project = getProjectRecord(userId, projectId, db);
    if (!project) return null;

    const existing = project.items.find((entry) => entry.cveId === item.cveId);
    const now = new Date().toISOString();
    const normalizedItem = normalizeProjectItem({
      cveId: item.cveId,
      note: item.note ?? existing?.note ?? "",
      addedAt: existing?.addedAt ?? now,
      owner: item.owner ?? existing?.owner ?? project.owner ?? "",
      remediationState: item.remediationState ?? existing?.remediationState ?? "not_started",
      slaDueAt: item.slaDueAt ?? existing?.slaDueAt ?? null,
      exception: item.exception ?? existing?.exception ?? null,
      updatedAt: now,
    });

    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now, projectId);

    db.prepare(`
      INSERT INTO project_items (
        project_id, cve_id, note, added_at, owner, remediation_state, sla_due_at, exception_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, cve_id) DO UPDATE SET
        note = excluded.note,
        owner = excluded.owner,
        remediation_state = excluded.remediation_state,
        sla_due_at = excluded.sla_due_at,
        exception_json = excluded.exception_json,
        updated_at = excluded.updated_at
    `).run(
      projectId,
      normalizedItem.cveId,
      normalizedItem.note ?? "",
      normalizedItem.addedAt,
      normalizedItem.owner ?? "",
      normalizedItem.remediationState ?? "not_started",
      normalizedItem.slaDueAt ?? null,
      normalizedItem.exception ? JSON.stringify(normalizedItem.exception) : "",
      normalizedItem.updatedAt ?? now
    );

    const summary = existing
      ? `Updated workflow for ${item.cveId}`
      : `Added ${item.cveId} to project`;

    appendProjectActivity(projectId, createActivityEntry(existing ? "project_item_updated" : "project_item_added", summary, now), db);

    return getProjectRecord(userId, projectId, db);
  });
}

export async function updateProjectItem(
  userId: string,
  projectId: string,
  cveId: string,
  input: Partial<Pick<ProjectItem, "note" | "owner" | "remediationState" | "slaDueAt" | "exception">>
): Promise<ProjectRecord | null> {
  return withTransaction((db) => {
    const project = getProjectRecord(userId, projectId, db);
    if (!project) return null;

    const existing = project.items.find((item) => item.cveId === cveId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const next = normalizeProjectItem({
      ...existing,
      ...input,
      cveId,
      updatedAt: now,
    });

    db.prepare(`
      UPDATE project_items
      SET note = ?, owner = ?, remediation_state = ?, sla_due_at = ?, exception_json = ?, updated_at = ?
      WHERE project_id = ? AND cve_id = ?
    `).run(
      next.note ?? "",
      next.owner ?? "",
      next.remediationState ?? "not_started",
      next.slaDueAt ?? null,
      next.exception ? JSON.stringify(next.exception) : "",
      next.updatedAt ?? now,
      projectId,
      cveId
    );
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now, projectId);

    const changes = summarizeProjectItemChanges(existing, next);
    if (changes.length > 0) {
      appendProjectActivity(projectId, createActivityEntry("project_item_updated", `${cveId}: ${changes.join(" • ")}`, now), db);
    }

    return getProjectRecord(userId, projectId, db);
  });
}

export async function removeProjectItem(userId: string, projectId: string, cveId: string): Promise<ProjectRecord | null> {
  return withTransaction((db) => {
    const project = getProjectRecord(userId, projectId, db);
    if (!project) return null;

    const now = new Date().toISOString();
    db.prepare("DELETE FROM project_items WHERE project_id = ? AND cve_id = ?").run(projectId, cveId);
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now, projectId);
    appendProjectActivity(projectId, createActivityEntry("project_item_removed", `Removed ${cveId} from project`, now), db);
    return getProjectRecord(userId, projectId, db);
  });
}

export function normalizeProjectName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 80);
}

export async function importProjects(userId: string, projects: ProjectRecord[], mode: WorkspaceImportMode): Promise<void> {
  withTransaction((db) => {
    if (mode === "replace") {
      db.prepare("DELETE FROM projects WHERE user_id = ?").run(userId);
    }

    const upsertProject = db.prepare(`
      INSERT INTO projects (id, user_id, name, description, owner, due_at, labels_json, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        owner = excluded.owner,
        due_at = excluded.due_at,
        labels_json = excluded.labels_json,
        status = excluded.status,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `);
    const insertItem = db.prepare(`
      INSERT INTO project_items (
        project_id, cve_id, note, added_at, owner, remediation_state, sla_due_at, exception_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertActivity = db.prepare(`
      INSERT INTO project_activity (id, project_id, action, summary, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const project of projects) {
      const requestedProjectId = project.id || crypto.randomUUID();
      const existingOwner = db.prepare(`
        SELECT user_id as userId
        FROM projects
        WHERE id = ?
      `).get(requestedProjectId) as { userId: string } | undefined;
      const projectId = existingOwner && existingOwner.userId !== userId
        ? crypto.randomUUID()
        : requestedProjectId;
      const normalized = normalizeProjectRecord({
        ...project,
        id: projectId,
      });

      upsertProject.run(
        projectId,
        userId,
        normalized.name,
        normalized.description,
        normalized.owner ?? "",
        normalized.dueAt ?? null,
        JSON.stringify(normalized.labels ?? []),
        normalized.status ?? "active",
        normalized.createdAt || new Date().toISOString(),
        normalized.updatedAt || new Date().toISOString()
      );

      db.prepare("DELETE FROM project_items WHERE project_id = ?").run(projectId);
      db.prepare("DELETE FROM project_activity WHERE project_id = ?").run(projectId);

      for (const item of normalized.items) {
        const normalizedItem = normalizeProjectItem(item);
        insertItem.run(
          projectId,
          normalizedItem.cveId,
          normalizedItem.note ?? "",
          normalizedItem.addedAt || new Date().toISOString(),
          normalizedItem.owner ?? "",
          normalizedItem.remediationState ?? "not_started",
          normalizedItem.slaDueAt ?? null,
          normalizedItem.exception ? JSON.stringify(normalizedItem.exception) : "",
          normalizedItem.updatedAt || normalized.updatedAt || new Date().toISOString()
        );
      }

      const activity = normalized.activity.length > 0
        ? normalized.activity.slice(0, MAX_ACTIVITY_ENTRIES)
        : [createActivityEntry("project_imported", `Imported project ${normalized.name}`, normalized.updatedAt || new Date().toISOString())];

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

function getProjectRecord(userId: string, projectId: string, db = getDb()): ProjectRecord | null {
  const row = db.prepare(`
    SELECT
      id,
      name,
      description,
      owner,
      due_at as dueAt,
      labels_json as labelsJson,
      status,
      created_at as createdAt,
      updated_at as updatedAt
    FROM projects
    WHERE user_id = ? AND id = ?
  `).get(userId, projectId) as ProjectRow | undefined;

  if (!row) {
    return null;
  }

  return buildProjectRecord(row, db);
}

function buildProjectRecord(row: ProjectRow, db = getDb()): ProjectRecord {
  const items = db.prepare(`
    SELECT
      cve_id as cveId,
      note,
      added_at as addedAt,
      owner,
      remediation_state as remediationState,
      sla_due_at as slaDueAt,
      exception_json as exceptionJson,
      updated_at as updatedAt
    FROM project_items
    WHERE project_id = ?
    ORDER BY added_at DESC
  `).all(row.id) as ProjectItemRow[];

  const activity = db.prepare(`
    SELECT id, action, summary, created_at as createdAt
    FROM project_activity
    WHERE project_id = ?
    ORDER BY created_at DESC, rowid DESC
    LIMIT ?
  `).all(row.id, MAX_ACTIVITY_ENTRIES) as AuditLogEntry[];

  const normalizedItems = items.map(normalizeProjectItemRow);

  return normalizeProjectRecord({
    id: row.id,
    name: row.name,
    description: row.description,
    owner: row.owner,
    dueAt: row.dueAt,
    labels: parseStringArray(row.labelsJson),
    status: normalizeProjectStatus(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: normalizedItems,
    activity,
    timeline: buildProjectTimeline(activity, row.dueAt, normalizedItems),
  });
}

function normalizeProjectRecord(project: ProjectRecord): ProjectRecord {
  return {
    id: project.id,
    name: normalizeProjectName(project.name) || "Imported project",
    description: project.description ?? "",
    owner: typeof project.owner === "string" ? project.owner.trim() : "",
    dueAt: normalizeDate(project.dueAt),
    labels: normalizeLabels(project.labels),
    status: normalizeProjectStatus(project.status),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    items: Array.isArray(project.items) ? project.items.map(normalizeProjectItem) : [],
    activity: Array.isArray(project.activity) ? project.activity.slice(0, MAX_ACTIVITY_ENTRIES) : [],
    timeline: Array.isArray(project.timeline) ? project.timeline.slice(0, MAX_ACTIVITY_ENTRIES) : [],
  };
}

function normalizeProjectItemRow(row: ProjectItemRow): ProjectItem {
  return normalizeProjectItem({
    cveId: row.cveId,
    note: row.note,
    addedAt: row.addedAt,
    owner: row.owner,
    remediationState: row.remediationState as RemediationState,
    slaDueAt: row.slaDueAt,
    exception: parseException(row.exceptionJson),
    updatedAt: row.updatedAt,
  });
}

function normalizeProjectItem(item: ProjectItem): ProjectItem {
  return {
    cveId: item.cveId,
    note: item.note ?? "",
    addedAt: item.addedAt || new Date().toISOString(),
    owner: typeof item.owner === "string" ? item.owner.trim() : "",
    remediationState: normalizeRemediationState(item.remediationState),
    slaDueAt: normalizeDate(item.slaDueAt),
    exception: normalizeException(item.exception),
    updatedAt: item.updatedAt || item.addedAt || new Date().toISOString(),
  };
}

function normalizeProjectStatus(value: unknown): ProjectStatus {
  return value === "planned" || value === "at_risk" || value === "done" ? value : "active";
}

function normalizeRemediationState(value: unknown): RemediationState {
  return value === "planned" || value === "in_progress" || value === "validated" || value === "deferred" || value === "exception"
    ? value
    : "not_started";
}

function normalizeLabels(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12)
    )
  );
}

function normalizeDate(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function normalizeException(value: ProjectExceptionRecord | null | undefined): ProjectExceptionRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const reason = value.reason?.trim() ?? "";
  const approvedBy = value.approvedBy?.trim() ?? "";
  const notes = value.notes?.trim() ?? "";
  const expiresAt = normalizeDate(value.expiresAt);

  if (!reason && !approvedBy && !notes && !expiresAt) {
    return null;
  }

  return {
    reason,
    approvedBy,
    expiresAt,
    notes,
  };
}

function parseException(value: string): ProjectExceptionRecord | null {
  if (!value) {
    return null;
  }

  try {
    return normalizeException(JSON.parse(value) as ProjectExceptionRecord);
  } catch {
    return null;
  }
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

function summarizeProjectChanges(previous: ProjectRecord, next: ProjectRecord): string[] {
  const changes: string[] = [];

  if (previous.name !== next.name) changes.push(`Renamed to ${next.name}`);
  if (previous.description !== next.description) changes.push(next.description ? "Description updated" : "Description cleared");
  if ((previous.owner ?? "") !== (next.owner ?? "")) changes.push(next.owner ? `Owner set to ${next.owner}` : "Owner cleared");
  if ((previous.status ?? "active") !== (next.status ?? "active")) changes.push(`Status moved to ${formatProjectStatus(next.status ?? "active")}`);
  if ((previous.dueAt ?? "") !== (next.dueAt ?? "")) changes.push(next.dueAt ? `Due date set to ${formatDateShort(next.dueAt)}` : "Due date cleared");
  if ((previous.labels ?? []).join("|") !== (next.labels ?? []).join("|")) {
    changes.push((next.labels ?? []).length > 0 ? `Labels updated: ${(next.labels ?? []).join(", ")}` : "Labels cleared");
  }

  return changes;
}

function summarizeProjectItemChanges(previous: ProjectItem, next: ProjectItem): string[] {
  const changes: string[] = [];
  if ((previous.note ?? "") !== (next.note ?? "")) changes.push(next.note ? "note updated" : "note cleared");
  if ((previous.owner ?? "") !== (next.owner ?? "")) changes.push(next.owner ? `owner ${next.owner}` : "owner cleared");
  if ((previous.remediationState ?? "not_started") !== (next.remediationState ?? "not_started")) changes.push(`remediation ${formatRemediationState(next.remediationState ?? "not_started")}`);
  if ((previous.slaDueAt ?? "") !== (next.slaDueAt ?? "")) changes.push(next.slaDueAt ? `SLA ${formatDateShort(next.slaDueAt)}` : "SLA cleared");
  if (JSON.stringify(previous.exception ?? null) !== JSON.stringify(next.exception ?? null)) changes.push(next.exception ? "exception recorded" : "exception cleared");
  return changes;
}

function buildProjectTimeline(activity: AuditLogEntry[], dueAt: string | null, items: ProjectItem[]): ProjectTimelineEvent[] {
  const events: ProjectTimelineEvent[] = activity.map((entry) => ({
    ...entry,
    kind: entry.action.includes("item") ? "vulnerability" : "project",
  }));

  if (dueAt) {
    events.push({
      id: `due-${dueAt}`,
      action: "project_due",
      summary: `Project due ${formatDateShort(dueAt)}`,
      createdAt: dueAt,
      kind: "project",
    });
  }

  for (const item of items) {
    if (!item.slaDueAt) continue;
    events.push({
      id: `sla-${item.cveId}-${item.slaDueAt}`,
      action: "sla_due",
      summary: `${item.cveId} SLA due ${formatDateShort(item.slaDueAt)}`,
      createdAt: item.slaDueAt,
      kind: "sla",
    });
  }

  return events
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, MAX_ACTIVITY_ENTRIES);
}

function parseStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function formatProjectStatus(status: ProjectStatus): string {
  switch (status) {
    case "planned":
      return "Planned";
    case "at_risk":
      return "At risk";
    case "done":
      return "Done";
    default:
      return "Active";
  }
}

function formatRemediationState(state: RemediationState): string {
  switch (state) {
    case "planned":
      return "planned";
    case "in_progress":
      return "in progress";
    case "validated":
      return "validated";
    case "deferred":
      return "deferred";
    case "exception":
      return "exception";
    default:
      return "not started";
  }
}

function formatDateShort(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}
