"use client";

import { getTriageStatusClasses, getTriageStatusLabel, TriageStatus } from "@/lib/triage";

export default function TriageBadge({ status }: { status: TriageStatus }) {
  return (
    <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${getTriageStatusClasses(status)}`}>
      {getTriageStatusLabel(status)}
    </span>
  );
}
