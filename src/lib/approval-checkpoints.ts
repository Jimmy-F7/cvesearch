import { summarizeTriageChanges, TriageRecord } from "./triage-shared";

export type ApprovalCheckpointScope = "triage_state" | "project_record" | "notification";

export interface ApprovalFieldChange {
  field: string;
  currentValue: string;
  proposedValue: string;
}

export interface ApprovalCheckpoint<TState> {
  id: string;
  scope: ApprovalCheckpointScope;
  source: string;
  title: string;
  summary: string;
  changes: ApprovalFieldChange[];
  nextState: TState;
}

export function buildTriageApprovalCheckpoint(
  previous: TriageRecord,
  next: TriageRecord,
  source = "AI triage agent"
): ApprovalCheckpoint<TriageRecord> | null {
  const changes = summarizeTriageChanges(previous, next);
  if (changes.length === 0) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    scope: "triage_state",
    source,
    title: `Approve triage update for ${previous.cveId}`,
    summary: changes.join(" • "),
    changes: [
      buildFieldChange("Status", previous.status, next.status),
      buildFieldChange("Owner", previous.owner, next.owner),
      buildFieldChange("Notes", previous.notes, next.notes),
      buildFieldChange("Tags", previous.tags.join(", "), next.tags.join(", ")),
    ].filter((value): value is ApprovalFieldChange => Boolean(value)),
    nextState: next,
  };
}

function buildFieldChange(field: string, currentValue: string, proposedValue: string): ApprovalFieldChange | null {
  if (currentValue === proposedValue) {
    return null;
  }

  return {
    field,
    currentValue: normalizeValue(currentValue),
    proposedValue: normalizeValue(proposedValue),
  };
}

function normalizeValue(value: string): string {
  return value.trim() ? value : "Not set";
}
