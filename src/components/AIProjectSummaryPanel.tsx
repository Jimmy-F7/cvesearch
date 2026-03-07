"use client";

import { useState } from "react";
import { AIProjectSummary } from "@/lib/types";

export default function AIProjectSummaryPanel({ projectId }: { projectId: string }) {
  const [summary, setSummary] = useState<AIProjectSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"executive" | "analyst" | "engineering">("executive");

  async function handleLoad() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/ai/project/${encodeURIComponent(projectId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load AI project summary");
      }

      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI project summary");
    } finally {
      setLoading(false);
    }
  }

  const active = summary ? summary[view] : null;

  return (
    <div className="mb-4 rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-200">AI Project Summary</h3>
          <p className="mt-1 text-sm text-gray-400">Turns project state into executive, analyst, and engineering views without modifying the project.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleLoad()}
          disabled={loading}
          className="rounded-lg bg-indigo-400 px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? "Summarizing..." : summary ? "Refresh Summary" : "Generate Summary"}
        </button>
      </div>

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      {summary ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-300">{summary.overview}</p>

          <div className="flex flex-wrap gap-2">
            <Metric label="Items" value={String(summary.metrics.totalItems)} />
            <Metric label="Critical" value={String(summary.metrics.criticalCount)} />
            <Metric label="High" value={String(summary.metrics.highCount)} />
            <Metric label="KEV" value={String(summary.metrics.kevCount)} />
            <Metric label="Investigating" value={String(summary.metrics.investigatingCount)} />
          </div>

          <div className="flex flex-wrap gap-2">
            {(["executive", "analyst", "engineering"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-wider ${view === option ? "border-indigo-400/30 bg-indigo-400/15 text-indigo-100" : "border-white/[0.08] bg-white/[0.03] text-gray-300 hover:bg-white/[0.06]"}`}
              >
                {option}
              </button>
            ))}
          </div>

          {active ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <h4 className="text-sm font-semibold text-white">{active.headline}</h4>
              <p className="mt-2 text-sm text-gray-300">{active.summary}</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                {active.bullets.map((item) => (
                  <li key={item} className="rounded-lg bg-white/[0.03] px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 py-1 text-[11px] text-gray-300">
      {label}: {value}
    </span>
  );
}
