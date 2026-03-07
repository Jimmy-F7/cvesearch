"use client";

import { CVESummary } from "@/lib/types";
import CVECard from "./CVECard";

interface CVEListProps {
  cves: CVESummary[];
  loading?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  skeletonCount?: number;
  selectable?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (cveId: string) => void;
}

function Skeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center gap-2">
        <div className="h-5 w-32 rounded bg-white/[0.06]" />
        <div className="h-5 w-20 rounded bg-white/[0.06]" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-4 w-full rounded bg-white/[0.04]" />
        <div className="h-4 w-3/4 rounded bg-white/[0.04]" />
      </div>
      <div className="mt-3 flex gap-3">
        <div className="h-4 w-24 rounded bg-white/[0.04]" />
        <div className="h-4 w-20 rounded bg-white/[0.04]" />
      </div>
    </div>
  );
}

export default function CVEList({
  cves,
  loading,
  emptyTitle = "No vulnerabilities found",
  emptyBody = "Try adjusting your search or filters",
  skeletonCount = 8,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
}: CVEListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    );
  }

  if (cves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] py-16">
        <svg className="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <p className="mt-4 text-base font-medium text-gray-400">{emptyTitle}</p>
        <p className="mt-1 text-sm text-gray-600">{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cves.map((cve, i) => (
        <CVECard
          key={cve.id || i}
          cve={cve}
          selectable={selectable}
          selected={selectedIds.includes(cve.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
