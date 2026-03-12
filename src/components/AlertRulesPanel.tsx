"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SearchState } from "@/lib/search";
import {
  AlertRule,
  ALERT_RULES_UPDATED_EVENT,
  deleteAlertRule,
  loadAlertRules,
  saveAlertRule,
} from "@/lib/alerts";
import ConfirmationDialog from "./ConfirmationDialog";
import InlineLoadingSpinner from "./InlineLoadingSpinner";

interface AlertRulesPanelProps {
  search: SearchState;
}

export default function AlertRulesPanel({ search }: AlertRulesPanelProps) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [name, setName] = useState("");
  const [pendingDeleteRule, setPendingDeleteRule] = useState<AlertRule | null>(null);
  const [busy, setBusy] = useState<null | "save" | "delete">(null);

  useEffect(() => {
    const sync = async () => setRules(await loadAlertRules());
    void sync();
    window.addEventListener(ALERT_RULES_UPDATED_EVENT, sync);
    return () => window.removeEventListener(ALERT_RULES_UPDATED_EVENT, sync);
  }, []);

  const defaultName = useMemo(() => {
    if (search.query) return `${search.query} alert`;
    if (search.product) return `${search.product} alert`;
    if (search.cwe) return `${search.cwe} alert`;
    if (search.minSeverity !== "ANY") return `${search.minSeverity} alert`;
    return "Latest critical alert";
  }, [search]);

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-white/40">Alert Rules</h2>
          <p className="mt-1 text-sm text-white/25">Track the current search as a workspace alert and review matches in the notification center.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={defaultName}
            className="input-base min-w-56 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              setBusy("save");
              void saveAlertRule(name || defaultName, search).then((next) => {
                setRules(next);
                setName("");
                setBusy(null);
              }).catch(() => setBusy(null));
            }}
            className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-black shadow-[0_2px_12px_-2px_rgba(245,158,11,0.3)] transition-all hover:shadow-[0_4px_20px_-2px_rgba(245,158,11,0.4)] hover:-translate-y-px disabled:opacity-50"
          >
            {busy === "save" ? (
              <span className="flex items-center gap-2"><InlineLoadingSpinner className="h-3.5 w-3.5" /> Saving...</span>
            ) : (
              "Save Alert"
            )}
          </button>
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="mt-4 text-sm text-white/20">No alert rules yet.</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {rules.map((rule) => (
            <div key={rule.id} className="glass-raised rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{rule.name}</div>
                  <div className="mt-1 text-[11px] text-white/20">
                    Last checked {rule.lastCheckedAt ? new Date(rule.lastCheckedAt).toLocaleString("en-US") : "never"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDeleteRule(rule)}
                  className="text-xs text-white/20 transition-colors hover:text-red-400"
                >
                  Delete
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {rule.search.query && <Chip label={`Query: ${rule.search.query}`} />}
                {rule.search.product && <Chip label={`Product: ${rule.search.product}`} />}
                {rule.search.cwe && <Chip label={`CWE: ${rule.search.cwe}`} />}
                {rule.search.minSeverity !== "ANY" && <Chip label={`Min: ${rule.search.minSeverity}`} />}
              </div>
              <Link
                href="/alerts"
                className="btn-ghost mt-3 inline-flex px-3 py-1.5 text-sm"
              >
                Open Alerts
              </Link>
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={pendingDeleteRule !== null}
        title="Delete alert rule?"
        message={pendingDeleteRule ? `${pendingDeleteRule.name} will no longer be tracked as a saved alert.` : ""}
        confirmLabel="Delete Alert Rule"
        busy={busy === "delete"}
        onConfirm={() => {
          if (!pendingDeleteRule) {
            return;
          }
          setBusy("delete");
          void deleteAlertRule(pendingDeleteRule.id).then((next) => {
            setRules(next);
            setPendingDeleteRule(null);
            setBusy(null);
          }).catch(() => setBusy(null));
        }}
        onClose={() => setPendingDeleteRule(null)}
      />
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return <span className="badge badge-xs border-white/[0.06] bg-white/[0.04] text-white/35">{label}</span>;
}
