"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCVEById } from "@/lib/api";
import { CVEDetail, CVESummary } from "@/lib/types";
import { readWatchlist, WATCHLIST_UPDATED_EVENT } from "@/lib/watchlist";
import { readTriageMap, TRIAGE_UPDATED_EVENT, TriageStatus } from "@/lib/triage";
import CVEList from "@/components/CVEList";
import AIDigestPanel from "@/components/AIDigestPanel";

export default function WatchlistPageClient() {
  const [items, setItems] = useState<CVESummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | TriageStatus>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const ids = readWatchlist();

      if (ids.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            return await getCVEById(id);
          } catch {
            return null;
          }
        })
      );

      if (!cancelled) {
        setItems(results.filter((item): item is CVEDetail => Boolean(item)));
        setLoading(false);
      }
    }

    load();
    window.addEventListener(WATCHLIST_UPDATED_EVENT, load);
    window.addEventListener(TRIAGE_UPDATED_EVENT, load);

    return () => {
      cancelled = true;
      window.removeEventListener(WATCHLIST_UPDATED_EVENT, load);
      window.removeEventListener(TRIAGE_UPDATED_EVENT, load);
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return items;

    const triage = readTriageMap();
    return items.filter((item) => (triage[item.id]?.status ?? "new") === statusFilter);
  }, [items, statusFilter]);

  const triageCount = useMemo(() => {
    const triage = readTriageMap();
    const counts: Record<TriageStatus, number> = {
      new: 0,
      investigating: 0,
      mitigated: 0,
      accepted: 0,
      closed: 0,
    };

    for (const item of items) {
      const status = triage[item.id]?.status ?? "new";
      counts[status] += 1;
    }

    return counts;
  }, [items]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Watchlist</h1>
          <p className="mt-2 text-base text-gray-500">Bookmarked CVEs and advisories with local triage status, notes, and ownership.</p>
        </div>
        <Link href="/" className="inline-flex rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white">
          Back to Search
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Summary label="Total" value={items.length} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        <Summary label="New" value={triageCount.new} active={statusFilter === "new"} onClick={() => setStatusFilter("new")} />
        <Summary
          label="Investigating"
          value={triageCount.investigating}
          active={statusFilter === "investigating"}
          onClick={() => setStatusFilter("investigating")}
        />
        <Summary
          label="Mitigated"
          value={triageCount.mitigated}
          active={statusFilter === "mitigated"}
          onClick={() => setStatusFilter("mitigated")}
        />
        <Summary
          label="Accepted"
          value={triageCount.accepted}
          active={statusFilter === "accepted"}
          onClick={() => setStatusFilter("accepted")}
        />
        <Summary
          label="Closed"
          value={triageCount.closed}
          active={statusFilter === "closed"}
          onClick={() => setStatusFilter("closed")}
        />
      </div>

      <div className="mb-6">
        <AIDigestPanel />
      </div>

      <CVEList cves={filteredItems} loading={loading} />
    </div>
  );
}

function Summary({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
        active
          ? "border-cyan-500/30 bg-cyan-500/10"
          : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]"
      }`}
    >
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-gray-400">{label}</div>
    </button>
  );
}
