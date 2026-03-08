"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Callout, Card, Flex, Grid, Heading, Text } from "@radix-ui/themes";
import { AIRunRecord } from "@/lib/types";
import ConfirmationDialog from "./ConfirmationDialog";

type PendingAction =
  | { kind: "delete-run"; runId: string; label: string }
  | { kind: "clear-all" }
  | null;

export default function RecentAIRunsPanel({ initialRuns }: { initialRuns: AIRunRecord[] }) {
  const [runs, setRuns] = useState(initialRuns);
  const [busy, setBusy] = useState<null | "clear-all" | `delete:${string}`>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const usageSummary = useMemo(() => summarizeAIRunUsage(runs), [runs]);

  async function handleDeleteRun(runId: string) {
    setBusy(`delete:${runId}`);
    setMessage(null);

    try {
      const response = await fetch(`/api/ai/runs?id=${encodeURIComponent(runId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to delete AI run");
      }

      setRuns((current) => current.filter((run) => run.id !== runId));
      setMessage({ type: "success", text: "AI run deleted." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to delete AI run" });
    } finally {
      setBusy(null);
      setPendingAction(null);
    }
  }

  async function handleClearAll() {
    setBusy("clear-all");
    setMessage(null);

    try {
      const response = await fetch("/api/ai/runs", {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to clear AI runs");
      }

      setRuns([]);
      setMessage({ type: "success", text: "Cleared recent AI runs." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to clear AI runs" });
    } finally {
      setBusy(null);
      setPendingAction(null);
    }
  }

  return (
    <Card size="3" className="border border-white/[0.06] bg-white/[0.03]">
      <Flex justify="between" align={{ initial: "start", md: "center" }} gap="4" wrap="wrap">
        <div>
          <Heading size="4" className="text-white">Recent AI Runs</Heading>
          <Text as="p" size="2" color="gray" className="mt-1">
            Inspect prompts, outcomes, latency, estimated tokens, and provider cost. Remove noisy entries or clear the history entirely.
          </Text>
        </div>
        <Button
          color="red"
          variant="soft"
          disabled={runs.length === 0 || busy !== null}
          onClick={() => setPendingAction({ kind: "clear-all" })}
        >
          {busy === "clear-all" ? "Clearing..." : "Clear All"}
        </Button>
      </Flex>

      <Grid columns={{ initial: "1", md: "4" }} gap="3" className="mt-4">
        <MetricCard label="Runs" value={String(usageSummary.runCount)} />
        <MetricCard label="Avg Latency" value={`${usageSummary.averageDurationMs}ms`} />
        <MetricCard label="Est. Tokens" value={usageSummary.totalTokens.toLocaleString("en-US")} />
        <MetricCard label="Est. Cost" value={`$${usageSummary.totalCostUsd.toFixed(4)}`} />
      </Grid>

      {message ? (
        <div className="mt-4">
          <Callout.Root color={message.type === "error" ? "red" : "green"} variant="soft">
            <Callout.Text>{message.text}</Callout.Text>
          </Callout.Root>
        </div>
      ) : null}

      {runs.length > 0 ? (
        <div className="mt-4 space-y-3">
          {runs.map((run) => (
            <Card key={run.id} size="2" className="border border-white/[0.06] bg-black/20">
              <Flex justify="between" align={{ initial: "start", md: "center" }} gap="3" wrap="wrap">
                <Flex gap="2" wrap="wrap" align="center">
                  <Badge color="cyan" variant="soft">{run.feature}</Badge>
                  <Badge color={run.status === "error" ? "red" : run.status === "fallback" ? "amber" : "green"} variant="soft">{run.status}</Badge>
                  <Badge color="gray" variant="soft">{run.provider}{run.model ? ` • ${run.model}` : ""}</Badge>
                  <Text size="1" color="gray">{new Date(run.createdAt).toLocaleString("en-US")}</Text>
                  <Text size="1" color="gray">{run.durationMs}ms</Text>
                  <Text size="1" color="gray">~{((run.promptTokensEstimate ?? 0) + (run.outputTokensEstimate ?? 0)).toLocaleString("en-US")} tokens</Text>
                  <Text size="1" color="gray">${(run.estimatedCostUsd ?? 0).toFixed(4)}</Text>
                </Flex>

                <Button
                  color="red"
                  variant="soft"
                  disabled={busy !== null}
                  onClick={() =>
                    setPendingAction({
                      kind: "delete-run",
                      runId: run.id,
                      label: `${run.feature} · ${new Date(run.createdAt).toLocaleString("en-US")}`,
                    })
                  }
                >
                  {busy === `delete:${run.id}` ? "Deleting..." : "Delete"}
                </Button>
              </Flex>

              <div className="mt-3 grid gap-3">
                <RunBlock title="Prompt" value={run.prompt} />
                <RunBlock title="Output" value={run.output} />

                {run.toolCalls.length > 0 ? (
                  <div>
                    <Text size="1" weight="bold" className="uppercase tracking-wider text-white/25">Tool Calls</Text>
                    <div className="mt-2 space-y-2">
                      {run.toolCalls.map((call) => (
                        <div key={`${run.id}-${call.tool}`} className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/50">
                          <span className="font-medium text-white">{call.tool}</span>
                          <span className="text-white/35"> - {call.summary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {run.error ? (
                  <Callout.Root color="amber" variant="soft">
                    <Callout.Text>{run.error}</Callout.Text>
                  </Callout.Root>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Text as="p" size="2" color="gray" className="mt-4">No AI runs have been recorded yet.</Text>
      )}

      <ConfirmationDialog
        open={pendingAction !== null}
        title={pendingAction?.kind === "clear-all" ? "Clear all recent AI runs?" : "Delete AI run?"}
        message={
          pendingAction?.kind === "clear-all"
            ? "This removes the entire Recent AI Runs history from the local workspace."
            : pendingAction
              ? `${pendingAction.label} will be removed from Recent AI Runs.`
              : ""
        }
        confirmLabel={pendingAction?.kind === "clear-all" ? "Clear History" : "Delete Run"}
        busy={busy !== null}
        onConfirm={() => {
          if (!pendingAction) {
            return;
          }

          if (pendingAction.kind === "clear-all") {
            void handleClearAll();
            return;
          }

          void handleDeleteRun(pendingAction.runId);
        }}
        onClose={() => setPendingAction(null)}
      />
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="2" className="border border-white/[0.06] bg-white/[0.03]">
      <Text as="p" size="1" weight="bold" className="uppercase tracking-wider text-white/25">{label}</Text>
      <Text as="p" size="3" className="mt-2 text-white">{value}</Text>
    </Card>
  );
}

function RunBlock({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <Text size="1" weight="bold" className="uppercase tracking-wider text-white/25">{title}</Text>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/50">{value}</pre>
    </div>
  );
}

function summarizeAIRunUsage(runs: AIRunRecord[]) {
  const totalDurationMs = runs.reduce((sum, run) => sum + run.durationMs, 0);
  const totalTokens = runs.reduce((sum, run) => sum + (run.promptTokensEstimate ?? 0) + (run.outputTokensEstimate ?? 0), 0);
  const totalCostUsd = runs.reduce((sum, run) => sum + (run.estimatedCostUsd ?? 0), 0);

  return {
    runCount: runs.length,
    averageDurationMs: runs.length > 0 ? Math.round(totalDurationMs / runs.length) : 0,
    totalTokens,
    totalCostUsd,
  };
}
