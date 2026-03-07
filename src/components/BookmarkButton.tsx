"use client";

import { useEffect, useState } from "react";
import { isWatchlisted, loadWatchlist, toggleWatchlistItem, WATCHLIST_UPDATED_EVENT } from "@/lib/watchlist";

interface BookmarkButtonProps {
  cveId: string;
  size?: "sm" | "md";
}

export default function BookmarkButton({ cveId, size = "md" }: BookmarkButtonProps) {
  const [watchlisted, setWatchlisted] = useState(false);

  useEffect(() => {
    const sync = async () => {
      await loadWatchlist();
      setWatchlisted(isWatchlisted(cveId));
    };
    void sync();
    window.addEventListener(WATCHLIST_UPDATED_EVENT, sync);
    return () => window.removeEventListener(WATCHLIST_UPDATED_EVENT, sync);
  }, [cveId]);

  const sizeClasses = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <button
      type="button"
      aria-label={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggleWatchlistItem(cveId).then((next) => setWatchlisted(next.includes(cveId)));
      }}
      className={`inline-flex items-center justify-center rounded-full border transition-colors ${sizeClasses} ${
        watchlisted
          ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
          : "border-white/[0.08] bg-white/[0.03] text-gray-500 hover:text-white"
      }`}
    >
      <svg className="h-4 w-4" fill={watchlisted ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75H7.5a2.25 2.25 0 00-2.25 2.25v14.489c0 .94 1.073 1.47 1.816.897L12 17.25l4.934 4.136a1.125 1.125 0 001.816-.897V6a2.25 2.25 0 00-2.25-2.25z" />
      </svg>
    </button>
  );
}
