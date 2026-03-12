"use client";

import { useCallback, useEffect, useState } from "react";
import { AIExposureAssessment } from "@/lib/types";
import LoadingIndicator from "./LoadingIndicator";

interface CachedAIExposureAssessment extends AIExposureAssessment {
  _cachedAt?: string;
}

export default function AIExposurePanel({ cveId }: { cveId: string }) {
  const [assessment, setAssessment] = useState<CachedAIExposureAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (regenerate = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/exposure/${encodeURIComponent(cveId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load AI exposure assessment");
      }

      setAssessment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI exposure assessment");
    } finally {
      setLoading(false);
    }
  }, [cveId]);

  useEffect(() => {
    let cancelled = false;
    load().then(() => { if (cancelled) setAssessment(null); });
    return () => { cancelled = true; };
  }, [load]);

  return (
    <div className="rounded-xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/[0.06] to-transparent p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/15">
            <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
            </svg>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-200">AI Exposure Agent</h2>
            <p className="text-[11px] text-white/25">Maps against tracked inventory to estimate internal impact.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {assessment ? <span className="badge badge-xs border-indigo-500/20 bg-indigo-500/8 text-indigo-200">Likely impact: {assessment.likelyImpact}</span> : null}
          {assessment?._cachedAt ? (
            <span className="text-[11px] text-white/20">{formatRelativeTime(assessment._cachedAt)}</span>
          ) : null}
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            className="rounded-lg border border-indigo-500/20 bg-indigo-500/8 px-2.5 py-1.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/15 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Regenerate"}
          </button>
        </div>
      </div>

      {loading ? <LoadingIndicator title="Estimating internal exposure" subtitle="Mapping against tracked inventory to estimate impact." /> : null}
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      {assessment ? (
        <div className="mt-4 space-y-4 animate-fade-in">
          <p className="text-sm text-white/70">{assessment.summary}</p>

          <Section title="Rationale" items={assessment.rationale} />

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">Matched Assets</h3>
            {assessment.matchedAssets.length > 0 ? (
              <div className="mt-3 space-y-3">
                {assessment.matchedAssets.map((asset) => (
                  <div key={asset.assetId} className="glass rounded-lg p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">{asset.assetName}</span>
                      <span className="badge badge-xs border-indigo-500/20 bg-indigo-500/8 text-indigo-200">{asset.confidence}</span>
                    </div>
                    <p className="mt-2 text-sm text-white/50">{asset.rationale}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {asset.matchingSignals.map((signal) => (
                        <span key={signal} className="badge badge-xs border-white/[0.06] bg-white/[0.04] text-white/40">{signal}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/25">No tracked assets matched. Add inventory mappings in settings.</p>
            )}
          </section>

          <Section title="Recommended Actions" items={assessment.recommendedActions} />
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-white/50">
        {items.map((item) => (
          <li key={item} className="rounded-lg bg-white/[0.03] px-3 py-2">{item}</li>
        ))}
      </ul>
    </section>
  );
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
