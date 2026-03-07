import { ApprovalCheckpoint } from "@/lib/approval-checkpoints";

export default function HumanApprovalCheckpoint<TState>({
  checkpoint,
  onApprove,
  onCancel,
}: {
  checkpoint: ApprovalCheckpoint<TState>;
  onApprove: (checkpoint: ApprovalCheckpoint<TState>) => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/8 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-200">Human Approval Checkpoint</h3>
          <p className="mt-1 text-sm text-gray-300">{checkpoint.title}</p>
          <p className="mt-1 text-xs text-gray-500">Source: {checkpoint.source}</p>
        </div>
        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
          Review required
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Summary</p>
        <p className="mt-2 text-sm text-gray-200">{checkpoint.summary}</p>
      </div>

      <div className="mt-4 space-y-2">
        {checkpoint.changes.map((change) => (
          <div key={change.field} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{change.field}</p>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Current</p>
                <p className="mt-1 text-sm text-gray-300">{change.currentValue}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-500">Proposed</p>
                <p className="mt-1 text-sm text-white">{change.proposedValue}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onApprove(checkpoint)}
          className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-medium text-black"
        >
          Approve And Apply
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/[0.08] px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
