import { SeverityLevel } from "@/lib/types";
import { severityColor, severityDotColor } from "@/lib/utils";

interface SeverityBadgeProps {
  severity: SeverityLevel;
  score?: number;
  version?: string;
  size?: "sm" | "md" | "lg";
}

export default function SeverityBadge({ severity, score, version, size = "md" }: SeverityBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${severityColor(severity)} ${sizeClasses[size]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${severityDotColor(severity)}`} />
      {score !== undefined && <span>{score.toFixed(1)}</span>}
      <span>{severity}</span>
      {version && <span className="opacity-60">v{version}</span>}
    </span>
  );
}
