import { formatOdds, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The core signal, drawn: the best available price sits above the de-vigged fair
 * price, and the gap is the value. Fill length scales with the edge so a strong
 * bet reads at a glance.
 */
export function ValueBar({
  fairOdds,
  edge,
  className,
}: {
  fairOdds: number;
  edge: number; // fraction
  className?: string;
}) {
  const fill = Math.min(94, Math.max(16, edge * 100 * 6));
  const strong = edge >= 0.05;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.1em]">
        <span className="tabular text-subtle">
          Fair {formatOdds(fairOdds)}
        </span>
        <span
          className={cn(
            "tabular font-semibold",
            strong ? "text-primary-strong" : "text-warning",
          )}
        >
          {formatPercent(edge, { signed: true })}
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn(
            "h-full rounded-full",
            strong ? "bg-primary" : "bg-warning/80",
          )}
          style={{ width: `${fill}%` }}
        />
        <span aria-hidden className="absolute inset-y-0 right-0 w-px bg-fg/25" />
      </div>
      <span className="text-[9px] uppercase tracking-[0.1em] text-subtle">
        Pris over fair odds
      </span>
    </div>
  );
}
