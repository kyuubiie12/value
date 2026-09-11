"use client";

import * as React from "react";
import { kellyStake } from "@/lib/betting-math";
import { DEFAULT_SETTINGS } from "@/lib/mock-data";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Segmented } from "@/components/ui/segmented";

const FRACTIONS = [
  { value: "1", label: "Fuld" },
  { value: "0.5", label: "½" },
  { value: "0.25", label: "¼" },
  { value: "0.1", label: "⅒" },
];

/** Inline Kelly stake sizing against the user's bankroll. */
export function KellyStakePanel({
  bestOdds,
  fairProbability,
  bankroll = DEFAULT_SETTINGS.startingBankroll,
}: {
  bestOdds: number;
  fairProbability: number;
  bankroll?: number;
}) {
  const [fraction, setFraction] = React.useState(String(DEFAULT_SETTINGS.kellyFraction));
  const frac = Number(fraction) || 0;

  const full = kellyStake(bestOdds, fairProbability, 1);
  const scaled = kellyStake(bestOdds, fairProbability, frac);
  const amount = scaled * bankroll;
  const units = amount / DEFAULT_SETTINGS.unitSize;

  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-bg p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">
          Anbefalet indsats
        </span>
        <Segmented size="sm" value={fraction} onChange={setFraction} options={FRACTIONS} />
      </div>
      <div className="mt-2 flex items-end justify-between">
        <span className="tabular text-xl font-semibold text-primary-strong">
          {formatCurrency(amount, DEFAULT_SETTINGS.currency)}
        </span>
        <span className="tabular text-[11px] text-subtle">
          {units.toLocaleString("da-DK", { maximumFractionDigits: 2 })} units ·{" "}
          {formatPercent(scaled, { digits: 2 })} af bankroll
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-subtle">
        Fuld Kelly: {formatPercent(full, { digits: 2 })} · fraktioneret ({fraction}×)
        sænker variansen.
      </p>
    </div>
  );
}
