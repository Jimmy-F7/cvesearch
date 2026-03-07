"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SearchState } from "@/lib/search";
import {
  deleteSavedView,
  getSavedViewHref,
  loadSavedViews,
  saveView,
  SAVED_VIEWS_UPDATED_EVENT,
  SavedView,
} from "@/lib/saved-views";

interface SavedViewsPanelProps {
  search: SearchState;
}

export default function SavedViewsPanel({ search }: SavedViewsPanelProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    const sync = async () => setSavedViews(await loadSavedViews());
    void sync();
    window.addEventListener(SAVED_VIEWS_UPDATED_EVENT, sync);
    return () => window.removeEventListener(SAVED_VIEWS_UPDATED_EVENT, sync);
  }, []);

  const defaultName = useMemo(() => {
    if (search.query) return search.query;
    if (search.product) return search.product;
    if (search.cwe) return search.cwe;
    return "Saved view";
  }, [search]);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Saved Views</h2>
          <p className="mt-1 text-sm text-gray-500">OpenCVE-style reusable searches stored in your workspace session.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={defaultName}
            className="min-w-56 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          />
            <button
              type="button"
              onClick={() => {
                void saveView(name || defaultName, search).then((next) => {
                  setSavedViews(next);
                  setName("");
                });
              }}
            className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            Save Current View
          </button>
        </div>
      </div>

      {savedViews.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No saved views yet.</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {savedViews.map((view) => (
            <div key={view.id} className="rounded-lg border border-white/[0.06] bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{view.name}</div>
                  <div className="mt-1 text-xs text-gray-500">{new Date(view.createdAt).toLocaleDateString("en-US")}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void deleteSavedView(view.id).then((next) => setSavedViews(next));
                  }}
                  className="text-xs text-gray-500 hover:text-red-400"
                >
                  Delete
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {view.search.query && <Chip label={`Query: ${view.search.query}`} />}
                {view.search.product && <Chip label={`Product: ${view.search.product}`} />}
                {view.search.cwe && <Chip label={`CWE: ${view.search.cwe}`} />}
                {view.search.minSeverity !== "ANY" && <Chip label={`Min: ${view.search.minSeverity}`} />}
              </div>
              <Link
                href={getSavedViewHref(view)}
                className="mt-4 inline-flex rounded-lg border border-white/[0.08] px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Open View
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-gray-400">{label}</span>;
}
