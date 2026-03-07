"use client";

import { useEffect, useState } from "react";
import {
  createDefaultTriageRecord,
  loadTriageRecord,
  parseTags,
  TRIAGE_UPDATED_EVENT,
  TriageRecord,
  TriageStatus,
  writeTriageRecord,
} from "@/lib/triage";

export default function TriagePanel({ cveId }: { cveId: string }) {
  const [record, setRecord] = useState<TriageRecord>(() => createDefaultTriageRecord(cveId));
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    const sync = async () => {
      const next = await loadTriageRecord(cveId);
      setRecord(next);
      setTagInput(next.tags.join(", "));
    };

    void sync();
    window.addEventListener(TRIAGE_UPDATED_EVENT, sync);
    return () => window.removeEventListener(TRIAGE_UPDATED_EVENT, sync);
  }, [cveId]);

  const persist = (next: TriageRecord) => {
    void writeTriageRecord({
      ...next,
      updatedAt: new Date().toISOString(),
    }).then((saved) => setRecord(saved));
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Triage</h2>
        <p className="mt-1 text-sm text-gray-500">Workspace-scoped analyst workflow for status, ownership, notes, and tags.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Status</span>
          <select
            value={record.status}
            onChange={(event) => persist({ ...record, status: event.target.value as TriageStatus })}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          >
            <option value="new">New</option>
            <option value="investigating">Investigating</option>
            <option value="mitigated">Mitigated</option>
            <option value="accepted">Accepted Risk</option>
            <option value="closed">Closed</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Owner</span>
          <input
            type="text"
            value={record.owner}
            onChange={(event) => setRecord((current) => ({ ...current, owner: event.target.value }))}
            onBlur={() => persist(record)}
            placeholder="Security engineer"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Tags</span>
          <input
            type="text"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onBlur={() => persist({ ...record, tags: parseTags(tagInput) })}
            placeholder="internet-facing, patch-window, openssl"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Notes</span>
          <textarea
            value={record.notes}
            onChange={(event) => setRecord((current) => ({ ...current, notes: event.target.value }))}
            onBlur={() => persist(record)}
            rows={5}
            placeholder="Investigation notes, patch status, compensating controls..."
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          />
        </label>
      </div>

      {record.updatedAt && (
        <p className="mt-4 text-xs text-gray-500">
          Last updated {new Date(record.updatedAt).toLocaleString("en-US")}
        </p>
      )}

      {record.activity.length > 0 && (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">Recent activity</h3>
          <div className="mt-3 space-y-2">
            {record.activity.slice(0, 6).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <p className="text-sm text-gray-300">{entry.summary}</p>
                <p className="mt-1 text-[11px] text-gray-500">
                  {new Date(entry.createdAt).toLocaleString("en-US")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
