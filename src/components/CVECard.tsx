import Link from "next/link";
import { CVESummary } from "@/lib/types";
import {
  getSeverityFromScore,
  formatDate,
  extractDescription,
  extractPublishedDate,
  extractCVEId,
  truncate,
} from "@/lib/utils";
import SeverityBadge from "./SeverityBadge";
import BookmarkButton from "./BookmarkButton";

interface CVECardProps {
  cve: CVESummary;
}

export default function CVECard({ cve }: CVECardProps) {
  const cveId = extractCVEId(cve);
  const description = extractDescription(cve);
  const published = extractPublishedDate(cve);
  const score = cve.cvss3 ?? cve.cvss;
  const severity = getSeverityFromScore(score);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Link href={`/cve/${encodeURIComponent(cveId)}`} className="group min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-base font-semibold text-white group-hover:text-cyan-400 transition-colors">
              {cveId}
            </h3>
            {score !== undefined && score !== null && (
              <SeverityBadge severity={severity} score={score} size="sm" />
            )}
            {cve.state && cve.state !== "PUBLISHED" && (
              <span className="rounded-md bg-gray-500/15 px-2 py-0.5 text-xs text-gray-400 border border-gray-500/30">
                {cve.state}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            {truncate(description, 250)}
          </p>
        </Link>
        <div className="self-start">
          <BookmarkButton cveId={cveId} size="sm" />
        </div>
      </div>

      <Link href={`/cve/${encodeURIComponent(cveId)}`} className="mt-3 block">
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        {published && (
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {formatDate(published)}
          </span>
        )}
        {cve.assigner && (
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
            {cve.assigner}
          </span>
        )}
        {cve.cwe && (
          <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-purple-400 border border-purple-500/20">
            {cve.cwe}
          </span>
        )}
        </div>
      </Link>
    </div>
  );
}
