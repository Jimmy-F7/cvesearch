import { SearchState } from "./search";
import { AlertRule } from "./workspace-types";

export const ALERT_RULES_UPDATED_EVENT = "cvesearch:alert-rules-updated";

let alertRulesCache: AlertRule[] = [];

export type { AlertRule };

export async function loadAlertRules(): Promise<AlertRule[]> {
  const next = await fetchAlertRules();
  alertRulesCache = next;
  return next;
}

export function readAlertRules(): AlertRule[] {
  return alertRulesCache;
}

export async function saveAlertRule(name: string, search: SearchState): Promise<AlertRule[]> {
  await mutateAlertRules("/api/alerts", {
    method: "POST",
    body: JSON.stringify({ name, search }),
  });
  return refreshAlertRules();
}

export async function deleteAlertRule(id: string): Promise<AlertRule[]> {
  await mutateAlertRules(`/api/alerts/${encodeURIComponent(id)}`, { method: "DELETE" });
  return refreshAlertRules();
}

export async function markAlertRuleChecked(id: string): Promise<AlertRule[]> {
  const res = await fetch(`/api/alerts/${encodeURIComponent(id)}`, { method: "PATCH" });
  if (!res.ok) {
    throw new Error("Failed to mark alert rule checked");
  }

  const data = await res.json().catch(() => []);
  const next = Array.isArray(data) ? data.filter(isAlertRule) : [];
  alertRulesCache = next;
  dispatchAlertRulesUpdated();
  return next;
}

export async function markAllAlertRulesChecked(): Promise<AlertRule[]> {
  const res = await fetch("/api/alerts/mark-all", { method: "POST" });
  if (!res.ok) {
    throw new Error("Failed to mark all alerts checked");
  }

  const data = await res.json().catch(() => []);
  const next = Array.isArray(data) ? data.filter(isAlertRule) : [];
  alertRulesCache = next;
  dispatchAlertRulesUpdated();
  return next;
}

async function refreshAlertRules(): Promise<AlertRule[]> {
  const next = await fetchAlertRules();
  alertRulesCache = next;
  dispatchAlertRulesUpdated();
  return next;
}

function dispatchAlertRulesUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ALERT_RULES_UPDATED_EVENT));
  }
}

async function fetchAlertRules(): Promise<AlertRule[]> {
  const res = await fetch("/api/alerts", { cache: "no-store" });
  if (!res.ok) {
    return [];
  }

  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data.filter(isAlertRule) : [];
}

async function mutateAlertRules(path: string, init: RequestInit): Promise<void> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error("Alert rules request failed");
  }
}

function isAlertRule(value: unknown): value is AlertRule {
  if (!value || typeof value !== "object") return false;

  return (
    "id" in value &&
    "name" in value &&
    "search" in value &&
    "createdAt" in value &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.search === "object" &&
    typeof value.createdAt === "string"
  );
}
