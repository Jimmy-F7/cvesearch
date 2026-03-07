"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

interface ImportResult {
  success: boolean;
  mode: "merge" | "replace";
  imported: {
    watchlist: number;
    savedViews: number;
    alertRules: number;
    triageRecords: number;
    projects: number;
  };
}

export default function WorkspaceDataPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [busy, setBusy] = useState<null | "export" | "import">(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleExport = async () => {
    setBusy("export");
    setMessage(null);

    try {
      const res = await fetch("/api/workspace/export", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to export workspace data");
      }

      const snapshot = await res.json();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const date = typeof snapshot?.exportedAt === "string" ? snapshot.exportedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `cvesearch-workspace-${date}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "Workspace export downloaded." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to export workspace data" });
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBusy("import");
    setMessage(null);

    try {
      const text = await file.text();
      const snapshot = JSON.parse(text);
      const res = await fetch("/api/workspace/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, snapshot }),
      });
      const data = (await res.json().catch(() => null)) as ImportResult | { error?: string } | null;

      if (!res.ok) {
        throw new Error((data as { error?: string } | null)?.error || "Failed to import workspace data");
      }

      const result = data as ImportResult;
      setMessage({
        type: "success",
        text: `Imported ${result.imported.watchlist} watchlist items, ${result.imported.savedViews} saved views, ${result.imported.alertRules} alert rules, ${result.imported.triageRecords} triage records, and ${result.imported.projects} projects using ${result.mode} mode.`,
      });
      event.target.value = "";
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to import workspace data" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Workspace Data</h2>
        <p className="mt-1 text-sm text-gray-500">
          Export or import projects, watchlist items, saved views, alert rules, and triage records for this workspace.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Import Mode</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("merge")}
              className={`rounded-lg border px-3 py-2 text-sm ${mode === "merge" ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200" : "border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.05]"}`}
            >
              Merge Import
            </button>
            <button
              type="button"
              onClick={() => setMode("replace")}
              className={`rounded-lg border px-3 py-2 text-sm ${mode === "replace" ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.05]"}`}
            >
              Replace Existing
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            `Merge` keeps current data and upserts imported records. `Replace` clears current workspace data first.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={busy !== null}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
          >
            {busy === "export" ? "Exporting..." : "Export JSON"}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy !== null}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {busy === "import" ? "Importing..." : "Import JSON"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleImport(event)}
            className="hidden"
          />
        </div>
      </div>

      {message && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${message.type === "error" ? "border-red-500/20 bg-red-500/10 text-red-200" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
