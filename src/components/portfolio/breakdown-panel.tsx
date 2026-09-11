"use client";

import * as React from "react";
import type { BreakdownDimension, Currency, PerformanceBreakdown } from "@/types";
import { formatPercent, formatSignedCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";

const DIMENSIONS: { value: BreakdownDimension; label: string }[] = [
  { value: "league", label: "Liga" },
  { value: "bookmaker", label: "Book" },
  { value: "market", label: "Marked" },
  { value: "month", label: "Måned" },
];

export function BreakdownPanel({
  data,
  currency,
}: {
  data: Record<BreakdownDimension, PerformanceBreakdown[]>;
  currency: Currency;
}) {
  const [dimension, setDimension] = React.useState<BreakdownDimension>("league");
  const rows = data[dimension] ?? [];
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.profit)));

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Fordeling</CardTitle>
          <CardDescription>Profit og ROI opdelt efter dimension</CardDescription>
        </div>
        <Segmented<BreakdownDimension>
          size="sm"
          value={dimension}
          onChange={setDimension}
          options={DIMENSIONS}
        />
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {rows.map((r) => {
          const positive = r.profit >= 0;
          const width = (Math.abs(r.profit) / maxAbs) * 100;
          return (
            <div key={r.key} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-fg">{r.label}</span>
                  <span className="shrink-0 text-[11px] text-subtle">
                    {r.bets} · {formatPercent(r.hitRate, { digits: 0 })}
                  </span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      positive ? "bg-positive/80" : "bg-negative/80",
                    )}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "tabular text-[13px] font-semibold",
                    positive ? "text-positive" : "text-negative",
                  )}
                >
                  {formatSignedCurrency(r.profit, currency)}
                </p>
                <p className="tabular text-[10px] text-subtle">
                  {formatPercent(r.roi, { signed: true })}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
