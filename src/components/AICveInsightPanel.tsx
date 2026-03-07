"use client";

import { useEffect, useState } from "react";
import { AICveInsight, CVEDetail } from "@/lib/types";
import { loadTriageRecord, TRIAGE_UPDATED_EVENT } from "@/lib/triage";

export default function AICveInsightPanel({ cveId, detail }: { cveId: string; detail?: CVEDetail | null }) {
  const [insight, setInsight] = useState<AICveInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const triage = await loadTriageRecord(cveId);
        const res = await fetch(`/api/ai/cve/${encodeURIComponent(cveId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ triage, detail }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load AI insight");
        }

        if (!cancelled) {
          setInsight(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load AI insight");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    window.addEventListener(TRIAGE_UPDATED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(TRIAGE_UPDATED_EVENT, load);
    };
  }, [cveId, detail]);

  return (
    <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-300">AI Insight</h2>
        <p className="mt-1 text-sm text-gray-400">Summary, triage guidance, remediation notes, and related-vulnerability context.</p>
      </div>

      {loading && <p className="text-sm text-gray-500">Generating insight...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {insight && !loading && (
        <div className="space-y-5">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Summary</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-200">{insight.summary}</p>
          </section>

          <section>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Triage Recommendation</h3>
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] text-red-300">
                {insight.triage.priority}
              </span>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-gray-300">
                {insight.triage.status}
              </span>
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-300">
                confidence: {insight.triage.confidence}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-300">{insight.triage.rationale}</p>
            <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-gray-300">
              <span className="font-medium text-white">Owner recommendation:</span> {insight.triage.ownerRecommendation}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {insight.triage.signals.map((signal) => (
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
            <ul className="mt-3 space-y-2 text-sm text-gray-300">
              {insight.triage.nextSteps.map((step) => (
                <li key={step} className="rounded-lg bg-white/[0.03] px-3 py-2">
                  {step}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Project Context</h3>
            <p className="mt-2 text-sm text-gray-300">{insight.projectContext.summary}</p>
            {insight.projectContext.projectNames.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {insight.projectContext.projectNames.map((project) => (
                  <span key={project} className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                    Project: {project}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Remediation Notes</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-300">
              {insight.remediation.map((item) => (
                <li key={item} className="rounded-lg bg-white/[0.03] px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Context Cluster</h3>
            <p className="mt-2 text-sm text-gray-300">{insight.cluster.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300">
                Canonical: {insight.cluster.canonicalId}
              </span>
              {insight.cluster.sourceIds.map((item) => (
                <span key={item} className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-gray-300">
                  Source: {item}
                </span>
              ))}
              {insight.cluster.relatedIds.map((item) => (
                <span key={item} className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
                  Related: {item}
                </span>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
