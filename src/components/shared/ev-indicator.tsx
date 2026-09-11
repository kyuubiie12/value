import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

type Tier = "low" | "mid" | "high";

function tierFor(edge: number): Tier {
  if (edge >= 0.05) return "high";
  if (edge >= 0.03) return "mid";
  return "low";
}

const TIER: Record<Tier, string> = {
  high: "bg-primary text-primary-contrast",
  mid: "bg-primary/18 text-primary-strong ring-1 ring-inset ring-primary/30",
  low: "bg-warning/15 text-warning ring-1 ring-inset ring-warning/25",
};

/**
 * The value badge. `edge` is a fraction (0.074 → "+7,4%"). Colour ramps with
 * the size of the edge so the feed is scannable by colour alone.
 */
export function EvIndicator({
  edge,
  size = "md",
  showLabel = false,
  className,
}: {
  edge: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}) {
  const tier = tierFor(edge);
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 rounded-[var(--radius-sm)] font-semibold",
        TIER[tier],
        size === "sm" && "px-1.5 py-0.5 text-[11px]",
        size === "md" && "px-2 py-0.5 text-xs",
        size === "lg" && "px-2.5 py-1 text-sm",
        className,
      )}
      title="Forventet værdi (Expected Value)"
    >
      {formatPercent(edge, { signed: true })}
      {showLabel && <span className="font-medium opacity-80">value</span>}
    </span>
  );
}
