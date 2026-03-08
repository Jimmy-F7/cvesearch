"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  buildSearchParams,
  getSearchSummary,
  hasActiveFilters,
  SearchState,
} from "@/lib/search";
import { HomeDashboardData } from "@/lib/types";
import AlertRulesPanel from "@/components/AlertRulesPanel";
import AIDigestPanel from "@/components/AIDigestPanel";
import DashboardPanel from "@/components/DashboardPanel";
import SavedViewsPanel from "@/components/SavedViewsPanel";

interface DashboardPageClientProps {
  dashboard: HomeDashboardData | null;
  search: SearchState;
}

export default function DashboardPageClient({
  dashboard,
  search,
}: DashboardPageClientProps) {
  const searchHref = useMemo(() => {
    const params = buildSearchParams(search);
    return params.toString() ? `/?${params.toString()}` : "/";
  }, [search]);
  const hasSearchContext = Boolean(search.query || hasActiveFilters(search));

  return (
    <div className="app-shell px-4 py-8 sm:px-6">
      <div className="page-header text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-300/80">Operations and triage</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Vulnerability Dashboard
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-[15px] text-white/35">
          Monitor the feed, review AI summaries, and manage reusable workflows away from the main search experience.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link href={searchHref} className="btn-primary inline-flex px-4 py-2 text-sm">
            Open Search
          </Link>
          <Link href="/alerts" className="btn-ghost inline-flex px-4 py-2 text-sm">
            Review Alerts
          </Link>
          <Link href="/watchlist" className="btn-ghost inline-flex px-4 py-2 text-sm">
            Open Watchlist
          </Link>
        </div>
      </div>

      {hasSearchContext && (
        <div className="mb-6 rounded-xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100">
          Dashboard tools are using your current search context:{" "}
          <span className="font-medium">{getSearchSummary(search)}</span>
        </div>
      )}

      {dashboard ? (
        <DashboardPanel dashboard={dashboard} />
      ) : (
        <div className="mb-6 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-sm text-white/45">
          Dashboard data is temporarily unavailable. Search, watchlist, and alert tools are still available below.
        </div>
      )}

      <div className="mb-6">
        <AIDigestPanel />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SavedViewsPanel search={search} />
        <AlertRulesPanel search={search} />
      </div>
    </div>
  );
}
