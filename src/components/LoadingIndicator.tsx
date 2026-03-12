interface LoadingIndicatorProps {
  title: string;
  subtitle?: string;
}

export default function LoadingIndicator({ title, subtitle }: LoadingIndicatorProps) {
  return (
    <div className="mt-4 animate-fade-in">
      <div className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-3">
        <svg className="h-5 w-5 shrink-0 animate-spin text-cyan-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <div className="min-w-0">
          <p className="text-sm font-medium text-cyan-200">{title}&hellip;</p>
          {subtitle && <p className="mt-0.5 text-xs text-white/35">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-cyan-500/10">
        <div className="ai-loading-bar h-full rounded-full bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
      </div>
    </div>
  );
}
