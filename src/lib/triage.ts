import {
  createDefaultTriageRecord,
  getTriageStatusClasses,
  getTriageStatusLabel,
  normalizeTriageRecord,
  parseTags,
  summarizeTriageChanges,
  TriageRecord,
  TriageStatus,
} from "./triage-shared";

export const TRIAGE_UPDATED_EVENT = "cvesearch:triage-updated";

let triageCache: Record<string, TriageRecord> = {};

export {
  createDefaultTriageRecord,
  getTriageStatusClasses,
  getTriageStatusLabel,
  parseTags,
  summarizeTriageChanges,
  type TriageRecord,
  type TriageStatus,
};

export async function loadTriageMap(): Promise<Record<string, TriageRecord>> {
  const next = await fetchTriageMap();
  triageCache = next;
  return next;
}

export function readTriageMap(): Record<string, TriageRecord> {
  return triageCache;
}

export async function loadTriageRecord(cveId: string): Promise<TriageRecord> {
  const record = await fetchTriageRecord(cveId);
  triageCache = {
    ...triageCache,
    [cveId]: record,
  };
  return record;
}

export function readTriageRecord(cveId: string): TriageRecord {
  return triageCache[cveId] ?? createDefaultTriageRecord(cveId);
}

export async function writeTriageRecord(record: TriageRecord): Promise<TriageRecord> {
  const res = await fetch(`/api/triage/${encodeURIComponent(record.cveId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });

  if (!res.ok) {
    throw new Error("Failed to save triage record");
  }

  const saved = normalizeTriageRecord(await res.json());
  triageCache = {
    ...triageCache,
    [saved.cveId]: saved,
  };
  dispatchTriageUpdated();
  return saved;
}

function dispatchTriageUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRIAGE_UPDATED_EVENT));
  }
}

async function fetchTriageMap(): Promise<Record<string, TriageRecord>> {
  const res = await fetch("/api/triage", { cache: "no-store" });
  if (!res.ok) {
    return {};
  }

  const data = await res.json().catch(() => ({}));
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(data).flatMap(([key, value]): Array<[string, TriageRecord]> =>
      value && typeof value === "object" && !Array.isArray(value)
        ? [[key, normalizeTriageRecord(value as TriageRecord)]]
        : []
    )
  );
}

async function fetchTriageRecord(cveId: string): Promise<TriageRecord> {
  const res = await fetch(`/api/triage/${encodeURIComponent(cveId)}`, { cache: "no-store" });
  if (!res.ok) {
    return createDefaultTriageRecord(cveId);
  }

  return normalizeTriageRecord(await res.json());
}
