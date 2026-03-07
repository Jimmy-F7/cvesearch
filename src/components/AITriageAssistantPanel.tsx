"use client";

import { useEffect, useMemo, useState } from "react";
import { AITriageSuggestion, CVEDetail } from "@/lib/types";
import { TRIAGE_UPDATED_EVENT, TriageRecord } from "@/lib/triage";

export default function AITriageAssistantPanel({
  cveId,
  detail,
  record,
  onRequestApproval,
}: {
  cveId: string;
  detail?: CVEDetail | null;
  record: TriageRecord;
  onRequestApproval: (updater: (current: TriageRecord) => TriageRecord, label: string) => void;
}) {
  const [suggestion, setSuggestion] = useState<AITriageSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestBody = useMemo(
    () => JSON.stringify({
      triage: {
        cveId: record.cveId,
        status: record.status,
        owner: record.owner,
        notes: record.notes,
        tags: record.tags,
        updatedAt: record.updatedAt,
      },
      detail,
    }),
    [detail, record.cveId, record.notes, record.owner, record.status, record.tags, record.updatedAt]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/ai/triage/${encodeURIComponent(cveId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load AI triage guidance");
        }

        if (!cancelled) {
          setSuggestion(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load AI triage guidance");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    window.addEventListener(TRIAGE_UPDATED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(TRIAGE_UPDATED_EVENT, load);
    };
  }, [cveId, requestBody]);

  return (
    <div className="mt-5 rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-300">AI Triage Agent</h3>
          <p className="mt-1 text-sm text-gray-400">Read-only guidance built from severity, EPSS, references, KEV, project context, and the current triage record. Any write now goes through an explicit approval checkpoint.</p>
        </div>
        {suggestion?.requiresHumanApproval ? (
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
            Human approval required
          </span>
        ) : null}
      </div>

      {loading ? <p className="mt-4 text-sm text-gray-500">Generating triage guidance...</p> : null}
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      {suggestion && !loading ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm leading-relaxed text-gray-200">{suggestion.summary}</p>

          <div className="flex flex-wrap gap-2">
            <Chip label={`Priority: ${suggestion.recommendation.priority}`} tone="red" />
            <Chip label={`Status: ${suggestion.recommendation.status}`} tone="cyan" />
            <Chip label={`Confidence: ${suggestion.recommendation.confidence}`} tone="gray" />
            <Chip label={`Owner: ${suggestion.recommendedOwner}`} tone="emerald" />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Rationale</p>
              <p className="mt-2 text-sm text-gray-300">{suggestion.recommendation.rationale}</p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ownership</p>
              <p className="mt-2 text-sm text-gray-300">{suggestion.ownershipRationale}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onRequestApproval((current) => ({ ...current, status: suggestion.recommendation.status }), "AI triage status recommendation")}
              className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-black"
            >
              Review Status
            </button>
            <button
              type="button"
              onClick={() => onRequestApproval((current) => ({ ...current, owner: suggestion.recommendedOwner }), "AI triage owner recommendation")}
              className="rounded-lg border border-emerald-500/20 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10"
            >
              Review Owner
            </button>
            <button
              type="button"
              onClick={() => onRequestApproval((current) => ({ ...current, tags: Array.from(new Set([...current.tags, ...suggestion.recommendedTags])) }), "AI triage tag recommendation")}
              className="rounded-lg border border-white/[0.08] px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white"
            >
              Review Tags
            </button>
            <button
              type="button"
              onClick={() => onRequestApproval((current) => ({
                ...current,
                status: suggestion.recommendation.status,
                owner: suggestion.recommendedOwner,
                tags: Array.from(new Set([...current.tags, ...suggestion.recommendedTags])),
              }), "AI triage full recommendation")}
              className="rounded-lg border border-amber-500/20 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/10"
            >
              Review Full Update
            </button>
          </div>

          {suggestion.recommendedTags.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Suggested Tags</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestion.recommendedTags.map((tag) => (
                  <Chip key={tag} label={tag} tone="amber" />
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Next Steps</p>
            <ul className="mt-2 space-y-2 text-sm text-gray-300">
              {suggestion.recommendation.nextSteps.map((step) => (
                <li key={step} className="rounded-lg bg-white/[0.03] px-3 py-2">{step}</li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {suggestion.recommendation.signals.map((signal) => (
              <div key={`${signal.label}-${signal.value}`} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{signal.label}</span>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-gray-300">{signal.level}</span>
                </div>
                <p className="mt-2 text-sm text-white">{signal.value}</p>
                <p className="mt-1 text-xs text-gray-400">{signal.rationale}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Project Context</p>
            <p className="mt-2 text-sm text-gray-300">{suggestion.projectContext.summary}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone: "red" | "cyan" | "gray" | "emerald" | "amber" }) {
  const tones = {
    red: "border-red-500/20 bg-red-500/10 text-red-200",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
    gray: "border-white/[0.08] bg-white/[0.05] text-gray-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  } as const;

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tones[tone]}`}>{label}</span>;
}
