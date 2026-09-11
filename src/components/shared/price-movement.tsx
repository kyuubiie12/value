import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { PriceMovement } from "@/types";
import { cn } from "@/lib/utils";
import { formatOdds } from "@/lib/format";

/**
 * Odds-movement indicator. `shortening` (odds falling → sharper) is treated as
 * a positive signal for a value bet; `drifting` as a caution.
 */
export function PriceMovementTag({
  movement,
  openingOdds,
  currentOdds,
  className,
}: {
  movement: PriceMovement;
  openingOdds?: number;
  currentOdds?: number;
  className?: string;
}) {
  const cfg = {
    shortening: {
      Icon: ArrowDownRight,
      tone: "text-positive",
      label: "Odds falder",
    },
    drifting: {
      Icon: ArrowUpRight,
      tone: "text-warning",
      label: "Odds stiger",
    },
    stable: { Icon: Minus, tone: "text-subtle", label: "Stabil" },
  }[movement];

  const delta =
    openingOdds != null && currentOdds != null
      ? `${openingOdds > currentOdds ? "" : "+"}${formatOdds(currentOdds - openingOdds)}`
      : null;

  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-[11px]", cfg.tone, className)}
      title={
        openingOdds != null && currentOdds != null
          ? `Åbnede ${formatOdds(openingOdds)}, nu ${formatOdds(currentOdds)}`
          : cfg.label
      }
    >
      <cfg.Icon className="size-3" aria-hidden />
      {delta ?? cfg.label}
    </span>
  );
}
