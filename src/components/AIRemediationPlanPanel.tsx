"use client";

import { useEffect, useState } from "react";
import { AIRemediationPlan, CVEDetail } from "@/lib/types";
import { loadTriageRecord, TRIAGE_UPDATED_EVENT } from "@/lib/triage";

export default function AIRemediationPlanPanel({ cveId, detail }: { cveId: string; detail?: CVEDetail | null }) {
  const [plan, setPlan] = useState<AIRemediationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const triage = await loadTriageRecord(cveId);
        const res = await fetch(`/api/ai/remediation/${encodeURIComponent(cveId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ triage, detail }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load AI remediation plan");
        }

        if (!cancelled) {
          setPlan(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load AI remediation plan");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    window.addEventListener(TRIAGE_UPDATED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(TRIAGE_UPDATED_EVENT, load);
    };
  }, [cveId, detail]);

  return (
    <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-300">AI Remediation Agent</h2>
          <p className="mt-1 text-sm text-gray-400">Drafts rollout strategy, compensating controls, validation, and ownership guidance without changing state automatically.</p>
        </div>
        {plan?.requiresHumanApproval ? (
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
            Human approval required
          </span>
        ) : null}
      </div>

      {loading ? <p className="mt-4 text-sm text-gray-500">Drafting remediation plan...</p> : null}
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      {plan && !loading ? (
        <div className="mt-4 space-y-5">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Summary</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-200">{plan.summary}</p>
          </section>

          <section>
            <div className="flex flex-wrap gap-2">
              <Badge label={`Change risk: ${plan.changeRisk}`} tone="amber" />
              <Badge label={`Owner: ${plan.recommendedOwner}`} tone="emerald" />
            </div>
            <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Strategy</p>
              <p className="mt-2 text-sm text-gray-300">{plan.strategy}</p>
            </div>
            <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ownership</p>
              <p className="mt-2 text-sm text-gray-300">{plan.ownerRationale}</p>
            </div>
          </section>

          <PlanList title="Compensating Controls" items={plan.compensatingControls} />
          <PlanList title="Validation Steps" items={plan.validationSteps} />
          <PlanList title="Rollout Notes" items={plan.rolloutNotes} />

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Project Context</h3>
            <p className="mt-2 text-sm text-gray-300">{plan.projectContext.summary}</p>
            {plan.projectContext.projectNames.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {plan.projectContext.projectNames.map((project) => (
                  <Badge key={project} label={`Project: ${project}`} tone="gray" />
                ))}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function PlanList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-gray-300">
        {items.map((item) => (
          <li key={item} className="rounded-lg bg-white/[0.03] px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Badge({ label, tone }: { label: string; tone: "amber" | "emerald" | "gray" }) {
  const tones = {
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    gray: "border-white/[0.08] bg-white/[0.05] text-gray-300",
  } as const;

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tones[tone]}`}>{label}</span>;
}
