"use client";

import Link from "next/link";
import { HomeDashboardData } from "@/lib/types";
import CVECard from "./CVECard";

interface DashboardPanelProps {
  dashboard: HomeDashboardData;
}

export default function DashboardPanel({ dashboard }: DashboardPanelProps) {
  return (
    <section className="mb-8 space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Critical in sample" value={dashboard.summary.criticalCount} />
        <SummaryTile label="High or above" value={dashboard.summary.highOrAboveCount} />
        <SummaryTile label="Published this week" value={dashboard.summary.publishedThisWeekCount} />
        <SummaryTile label="Known exploited" value={dashboard.summary.knownExploitedCount} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {dashboard.presets.map((preset) => (
          <Link
            key={preset.title}
            href={preset.href}
            className={`rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:border-white/20 ${preset.accentClassName}`}
          >
            <div className="text-sm font-semibold">{preset.title}</div>
            <p className="mt-2 text-sm opacity-85">{preset.description}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardColumn
          title="Latest Critical"
          description="Fresh critical issues from the sampled feed."
          cves={dashboard.latestCritical}
        />
        <DashboardColumn
          title="Highest Risk"
          description="KEV, EPSS, exploit signals, and severity combined into one view."
          cves={dashboard.highestRisk}
        />
        <DashboardColumn
          title="Recent High Impact"
          description="High-severity records published during the last 7 days."
          cves={dashboard.recentHighImpact}
        />
      </div>
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-sm text-gray-400">{label}</div>
    </div>
  );
}

function DashboardColumn({
  title,
  description,
  cves,
}: {
  title: string;
  description: string;
  cves: HomeDashboardData["latestCritical"];
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <div className="space-y-3">
        {cves.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-sm text-gray-500">
            No matching vulnerabilities in the current sample.
          </div>
        ) : (
          cves.map((cve) => <CVECard key={`${title}-${cve.id}`} cve={cve} />)
        )}
      </div>
    </div>
  );
}
