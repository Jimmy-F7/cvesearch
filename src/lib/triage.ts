export const TRIAGE_UPDATED_EVENT = "cvesearch:triage-updated";
const TRIAGE_STORAGE_KEY = "cvesearch.triage";

export type TriageStatus = "new" | "investigating" | "mitigated" | "accepted" | "closed";

export interface TriageRecord {
  cveId: string;
  status: TriageStatus;
  owner: string;
  notes: string;
  tags: string[];
  updatedAt: string;
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

  const next = {
    ...readTriageMap(),
    [record.cveId]: normalizeTriageRecord(record),
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
  };
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
  };
}

function isValidStatus(status: string): status is TriageStatus {
  return ["new", "investigating", "mitigated", "accepted", "closed"].includes(status);
}
