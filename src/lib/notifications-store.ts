import { generateDigest } from "./ai-service";
import { getDb } from "./db";
import { loadWorkspaceContextSnapshot } from "./workspace-context";
import { NotificationCadence, NotificationDeliveryRecord, NotificationPreferenceRecord } from "./workspace-types";

interface NotificationPreferenceRow {
  id: string;
  teamName: string;
  channel: string;
  destination: string;
  cadence: string;
  enabled: number | boolean;
  createdAt: string;
  updatedAt: string;
  lastSentAt: string | null;
  nextRunAt: string | null;
}

interface NotificationDeliveryRow {
  id: string;
  preferenceId: string;
  teamName: string;
  channel: string;
  destination: string;
  cadence: string;
  headline: string;
  summary: string;
  status: string;
  itemCount: number;
  createdAt: string;
  deliveredAt: string | null;
}

export async function listNotificationPreferencesForUser(userId: string): Promise<NotificationPreferenceRecord[]> {
  const rows = getDb().prepare(`
    SELECT
      id,
      team_name as teamName,
      channel,
      destination,
      cadence,
      enabled,
      created_at as createdAt,
      updated_at as updatedAt,
      last_sent_at as lastSentAt,
      next_run_at as nextRunAt
    FROM user_notification_preferences
    WHERE user_id = ?
    ORDER BY updated_at DESC, created_at DESC
  `).all(userId) as NotificationPreferenceRow[];

  return rows.map(normalizePreferenceRow);
}

export async function createNotificationPreferenceForUser(
  userId: string,
  input: Pick<NotificationPreferenceRecord, "teamName" | "channel" | "destination" | "cadence"> & { enabled?: boolean }
): Promise<NotificationPreferenceRecord> {
  const now = new Date().toISOString();
  const record = normalizePreference({
    id: crypto.randomUUID(),
    teamName: input.teamName,
    channel: input.channel,
    destination: input.destination,
    cadence: input.cadence,
    enabled: input.enabled ?? true,
    createdAt: now,
    updatedAt: now,
    lastSentAt: null,
    nextRunAt: scheduleNextRun(now, input.cadence),
  });

  getDb().prepare(`
    INSERT INTO user_notification_preferences (
      id, user_id, team_name, channel, destination, cadence, enabled, created_at, updated_at, last_sent_at, next_run_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    userId,
    record.teamName,
    record.channel,
    record.destination,
    record.cadence,
    record.enabled ? 1 : 0,
    record.createdAt,
    record.updatedAt,
    record.lastSentAt,
    record.nextRunAt
  );

  return record;
}

export async function updateNotificationPreferenceForUser(
  userId: string,
  id: string,
  input: Partial<Pick<NotificationPreferenceRecord, "teamName" | "channel" | "destination" | "cadence" | "enabled">>
): Promise<NotificationPreferenceRecord | null> {
  const existing = await getNotificationPreferenceForUser(userId, id);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const cadence = input.cadence ?? existing.cadence;
  const nextRunAt = input.enabled === false
    ? null
    : input.cadence && input.cadence !== existing.cadence
      ? scheduleNextRun(now, cadence)
      : existing.nextRunAt;

  const record = normalizePreference({
    ...existing,
    ...input,
    id,
    updatedAt: now,
    nextRunAt,
  });

  getDb().prepare(`
    UPDATE user_notification_preferences
    SET team_name = ?, channel = ?, destination = ?, cadence = ?, enabled = ?, updated_at = ?, next_run_at = ?
    WHERE user_id = ? AND id = ?
  `).run(
    record.teamName,
    record.channel,
    record.destination,
    record.cadence,
    record.enabled ? 1 : 0,
    record.updatedAt,
    record.nextRunAt,
    userId,
    id
  );

  return record;
}

export async function deleteNotificationPreferenceForUser(userId: string, id: string): Promise<boolean> {
  const result = getDb().prepare("DELETE FROM user_notification_preferences WHERE user_id = ? AND id = ?").run(userId, id);
  return result.changes > 0;
}

export async function getNotificationPreferenceForUser(userId: string, id: string): Promise<NotificationPreferenceRecord | null> {
  const row = getDb().prepare(`
    SELECT
      id,
      team_name as teamName,
      channel,
      destination,
      cadence,
      enabled,
      created_at as createdAt,
      updated_at as updatedAt,
      last_sent_at as lastSentAt,
      next_run_at as nextRunAt
    FROM user_notification_preferences
    WHERE user_id = ? AND id = ?
  `).get(userId, id) as NotificationPreferenceRow | undefined;

  return row ? normalizePreferenceRow(row) : null;
}

export async function listNotificationDeliveriesForUser(userId: string, limit = 12): Promise<NotificationDeliveryRecord[]> {
  const rows = getDb().prepare(`
    SELECT
      id,
      preference_id as preferenceId,
      team_name as teamName,
      channel,
      destination,
      cadence,
      headline,
      summary,
      status,
      item_count as itemCount,
      created_at as createdAt,
      delivered_at as deliveredAt
    FROM user_notification_deliveries
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, limit) as NotificationDeliveryRow[];

  return rows.map(normalizeDeliveryRow);
}

export async function runDueNotificationDigestsForUser(
  userId: string,
  input?: { force?: boolean; preview?: boolean; preferenceId?: string }
): Promise<NotificationDeliveryRecord[]> {
  const preferences = await listNotificationPreferencesForUser(userId);
  const now = new Date();
  const due = preferences.filter((preference) => {
    if (!preference.enabled) return false;
    if (input?.preferenceId && preference.id !== input.preferenceId) return false;
    if (input?.force) return true;
    if (!preference.nextRunAt) return false;
    return Date.parse(preference.nextRunAt) <= now.getTime();
  });

  if (due.length === 0) {
    return [];
  }

  const workspace = await loadWorkspaceContextSnapshot(userId);
  const digest = await generateDigest({
    watchlist: workspace.watchlist.map((item) => ({ id: item.cveId })),
    alerts: workspace.alertEvaluations.map((item) => ({
      name: item.rule.name,
      unread: item.unread,
      topMatches: item.matching.slice(0, 3).map((match) => match.id),
    })),
    projects: workspace.projects.map((project) => ({
      name: project.name,
      items: project.items,
      updatedAt: project.updatedAt,
    })),
  });

  const deliveries: NotificationDeliveryRecord[] = [];

  for (const preference of due) {
    const createdAt = now.toISOString();
    const delivery: NotificationDeliveryRecord = {
      id: crypto.randomUUID(),
      preferenceId: preference.id,
      teamName: preference.teamName,
      channel: preference.channel,
      destination: preference.destination,
      cadence: preference.cadence,
      headline: digest.headline,
      summary: digest.sections.map((section) => `${section.title}: ${section.body}`).join("\n"),
      status: input?.preview ? "preview" : "sent",
      itemCount: digest.sections.reduce((sum, section) => sum + section.items.length, 0),
      createdAt,
      deliveredAt: createdAt,
    };

    getDb().prepare(`
      INSERT INTO user_notification_deliveries (
        id, user_id, preference_id, team_name, channel, destination, cadence, headline, summary, status, item_count, created_at, delivered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      delivery.id,
      userId,
      delivery.preferenceId,
      delivery.teamName,
      delivery.channel,
      delivery.destination,
      delivery.cadence,
      delivery.headline,
      delivery.summary,
      delivery.status,
      delivery.itemCount,
      delivery.createdAt,
      delivery.deliveredAt
    );

    if (!input?.preview) {
      getDb().prepare(`
        UPDATE user_notification_preferences
        SET last_sent_at = ?, next_run_at = ?, updated_at = ?
        WHERE user_id = ? AND id = ?
      `).run(
        createdAt,
        scheduleNextRun(createdAt, preference.cadence),
        createdAt,
        userId,
        preference.id
      );
    }

    deliveries.push(delivery);
  }

  return deliveries;
}

function normalizePreferenceRow(row: NotificationPreferenceRow): NotificationPreferenceRecord {
  return normalizePreference({
    id: row.id,
    teamName: row.teamName,
    channel: row.channel as NotificationPreferenceRecord["channel"],
    destination: row.destination,
    cadence: row.cadence as NotificationCadence,
    enabled: row.enabled === true || row.enabled === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastSentAt: row.lastSentAt,
    nextRunAt: row.nextRunAt,
  });
}

function normalizePreference(value: NotificationPreferenceRecord): NotificationPreferenceRecord {
  return {
    id: value.id,
    teamName: typeof value.teamName === "string" ? value.teamName.trim() || "Security team" : "Security team",
    channel: isChannel(value.channel) ? value.channel : "in_app",
    destination: typeof value.destination === "string" ? value.destination.trim() : "",
    cadence: value.cadence === "weekly" ? "weekly" : "daily",
    enabled: value.enabled !== false,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    lastSentAt: value.lastSentAt ?? null,
    nextRunAt: value.nextRunAt ?? null,
  };
}

function normalizeDeliveryRow(row: NotificationDeliveryRow): NotificationDeliveryRecord {
  return {
    id: row.id,
    preferenceId: row.preferenceId,
    teamName: row.teamName,
    channel: isChannel(row.channel) ? row.channel : "in_app",
    destination: row.destination,
    cadence: row.cadence === "weekly" ? "weekly" : "daily",
    headline: row.headline,
    summary: row.summary,
    status: row.status === "preview" ? "preview" : "sent",
    itemCount: row.itemCount,
    createdAt: row.createdAt,
    deliveredAt: row.deliveredAt,
  };
}

function isChannel(value: string): value is NotificationPreferenceRecord["channel"] {
  return ["in_app", "email", "slack", "webhook"].includes(value);
}

function scheduleNextRun(baseIso: string, cadence: NotificationCadence): string {
  const next = new Date(baseIso);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);

  if (cadence === "weekly") {
    next.setUTCDate(next.getUTCDate() + 7);
  } else {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.toISOString();
}
