import type { ValueOpportunity } from "@/types";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Two edge read-outs shown side by side:
 *  - B-fair: best available price vs the bookmaker market average
 *  - S-fair: best available price vs the de-vigged sharp fair odds (the real signal)
 */
export function FairPills({
  opportunity,
  size = "md",
  className,
}: {
  opportunity: ValueOpportunity;
  size?: "sm" | "md";
  className?: string;
}) {
  const o = opportunity;
  const bookEdge = o.averageOdds > 0 ? o.bestOdds / o.averageOdds - 1 : 0;
  const sharpEdge = o.fairOdds > 0 ? o.bestOdds / o.fairOdds - 1 : 0;

  if (o.fairBasis === "consensus" || o.fairBasis === "history") {
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
        <Pill label={o.fairBasis === "history" ? "Vs. hans kampe" : "Vs. andre"} value={sharpEdge} tone="book" size={size} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Pill label="B-fair" value={bookEdge} tone="book" size={size} />
      <Pill label="S-fair" value={sharpEdge} tone="sharp" size={size} />
    </div>
  );
}

function Pill({
  label,
  value,
  tone,
  size,
}: {
  label: string;
  value: number;
  tone: "book" | "sharp";
  size: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset",
        size === "sm" ? "px-1.5 py-[3px] text-[10px]" : "px-2 py-0.5 text-[11px]",
        tone === "book"
          ? "bg-positive/12 text-positive ring-positive/25"
          : "bg-info/12 text-info ring-info/25",
        value < 0 && "opacity-70",
      )}
      title={
        tone === "book"
          ? "Bedste pris vs. gennemsnittet af bookmakerne"
          : "Bedste pris vs. de-viggede fair odds fra de skarpe bøger"
      }
    >
      <span className="font-medium opacity-70">{label}</span>
      {formatPercent(value, { signed: true })}
    </span>
  );
}
