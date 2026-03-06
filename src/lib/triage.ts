import { AuditLogEntry } from "./types";

export const TRIAGE_UPDATED_EVENT = "cvesearch:triage-updated";
const TRIAGE_STORAGE_KEY = "cvesearch.triage";
const MAX_TRIAGE_ACTIVITY = 20;

export type TriageStatus = "new" | "investigating" | "mitigated" | "accepted" | "closed";

export interface TriageRecord {
  cveId: string;
  status: TriageStatus;
  owner: string;
  notes: string;
  tags: string[];
  updatedAt: string;
  activity: AuditLogEntry[];
}

export function readTriageMap(): Record<string, TriageRecord> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(TRIAGE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .flatMap(([key, value]): Array<[string, TriageRecord]> =>
          isTriageRecord(value) ? [[key, normalizeTriageRecord(value)]] : []
        )
    );
  } catch {
    return {};
  }
}

export function readTriageRecord(cveId: string): TriageRecord {
  return readTriageMap()[cveId] ?? createDefaultTriageRecord(cveId);
}

export function writeTriageRecord(record: TriageRecord): TriageRecord {
  if (typeof window === "undefined") return record;

  const previous = readTriageRecord(record.cveId);
  const nextRecord = normalizeTriageRecord(record);
  const nextActivity = buildTriageActivity(previous, nextRecord);

  const next = {
    ...readTriageMap(),
    [record.cveId]: {
      ...nextRecord,
      activity: nextActivity,
    },
  };

  window.localStorage.setItem(TRIAGE_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(TRIAGE_UPDATED_EVENT));

  return next[record.cveId];
}

export function createDefaultTriageRecord(cveId: string): TriageRecord {
  return {
    cveId,
    status: "new",
    owner: "",
    notes: "",
    tags: [],
    updatedAt: "",
    activity: [],
  };
}

export function summarizeTriageChanges(previous: TriageRecord, next: TriageRecord): string[] {
  const changes: string[] = [];

  if (previous.status !== next.status) {
    changes.push(`Status changed to ${getTriageStatusLabel(next.status)}`);
  }
  if (previous.owner !== next.owner) {
    changes.push(next.owner ? `Owner set to ${next.owner}` : "Owner cleared");
  }
  if (previous.notes !== next.notes) {
    changes.push(next.notes ? "Notes updated" : "Notes cleared");
  }
  if (previous.tags.join("|") !== next.tags.join("|")) {
    changes.push(next.tags.length > 0 ? `Tags updated: ${next.tags.join(", ")}` : "Tags cleared");
  }

  return changes;
}

export function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function getTriageStatusLabel(status: TriageStatus): string {
  switch (status) {
    case "investigating":
      return "Investigating";
    case "mitigated":
      return "Mitigated";
    case "accepted":
      return "Accepted Risk";
    case "closed":
      return "Closed";
    default:
      return "New";
  }
}

export function getTriageStatusClasses(status: TriageStatus): string {
  switch (status) {
    case "investigating":
      return "border-yellow-500/25 bg-yellow-500/10 text-yellow-300";
    case "mitigated":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
    case "accepted":
      return "border-orange-500/25 bg-orange-500/10 text-orange-300";
    case "closed":
      return "border-gray-500/25 bg-gray-500/10 text-gray-300";
    default:
      return "border-cyan-500/25 bg-cyan-500/10 text-cyan-300";
  }
}

function isTriageRecord(value: unknown): value is TriageRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;

  return (
    typeof record.cveId === "string" &&
    typeof record.status === "string" &&
    typeof record.owner === "string" &&
    typeof record.notes === "string" &&
    Array.isArray(record.tags)
  );
}

function normalizeTriageRecord(record: TriageRecord): TriageRecord {
  return {
    cveId: record.cveId,
    status: isValidStatus(record.status) ? record.status : "new",
    owner: record.owner ?? "",
    notes: record.notes ?? "",
    tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === "string") : [],
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
    activity: Array.isArray(record.activity) ? record.activity.filter(isAuditLogEntry).slice(0, MAX_TRIAGE_ACTIVITY) : [],
  };
}

function isValidStatus(status: string): status is TriageStatus {
  return ["new", "investigating", "mitigated", "accepted", "closed"].includes(status);
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

function buildTriageActivity(previous: TriageRecord, next: TriageRecord): AuditLogEntry[] {
  const changes = summarizeTriageChanges(previous, next);
  if (changes.length === 0 || !next.updatedAt) {
    return previous.activity;
  }

  const entry: AuditLogEntry = {
    id: crypto.randomUUID(),
    action: "triage_updated",
    summary: changes.join(" • "),
    createdAt: next.updatedAt,
  };
  return [entry, ...previous.activity].slice(0, MAX_TRIAGE_ACTIVITY);
}
