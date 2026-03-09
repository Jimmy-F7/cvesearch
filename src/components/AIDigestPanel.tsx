"use client";

import { useEffect, useState } from "react";
import { AIDigest } from "@/lib/types";

interface CachedAIDigest extends AIDigest {
  _cachedAt?: string;
}

export default function AIDigestPanel() {
  const [digest, setDigest] = useState<CachedAIDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(regenerate = false) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regenerate,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate digest");
      }

      setDigest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate digest");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void load().then(() => {
      if (cancelled) {
        setDigest(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.06] to-transparent p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15">
            <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">AI Daily Digest</h2>
            <p className="text-[11px] text-white/25">Summarized view across your watchlist, alerts, and projects.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {digest?._cachedAt ? (
            <span className="text-[11px] text-white/20">{formatRelativeTime(digest._cachedAt)}</span>
          ) : null}
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            className="rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Regenerate"}
          </button>
        </div>
      </div>

      {loading && !digest && <p className="text-sm text-white/25">Compiling digest...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {digest && !loading && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-medium text-white">
            {digest.headline}
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {digest.sections.map((section) => (
              <div key={section.title} className="glass rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                <p className="mt-2 text-sm text-white/40">{section.body}</p>
                <ul className="mt-3 space-y-2 text-sm text-white/60">
                  {section.items.map((item) => (
                    <li key={item} className="rounded-lg bg-white/[0.03] px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
