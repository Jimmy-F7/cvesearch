"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCVEById } from "@/lib/api";
import { CVEDetail, CVESummary } from "@/lib/types";
import { readWatchlist, WATCHLIST_UPDATED_EVENT } from "@/lib/watchlist";
import CVEList from "@/components/CVEList";

export default function WatchlistPageClient() {
  const [items, setItems] = useState<CVESummary[]>([]);
  const [loading, setLoading] = useState(true);

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

    return () => {
      cancelled = true;
      window.removeEventListener(WATCHLIST_UPDATED_EVENT, load);
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Watchlist</h1>
          <p className="mt-2 text-base text-gray-500">Bookmarked CVEs and advisories stored locally in this browser.</p>
        </div>
        <Link href="/" className="inline-flex rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white">
          Back to Search
        </Link>
      </div>

      <CVEList cves={items} loading={loading} />
    </div>
  );
}
