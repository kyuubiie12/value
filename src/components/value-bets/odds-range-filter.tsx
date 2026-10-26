"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateSettingsAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

/** 0 = no limit on that side. */
export interface OddsRange {
  min: number;
  max: number;
}

const PRESETS: { label: string; range: OddsRange }[] = [
  { label: "Alle", range: { min: 0, max: 0 } },
  { label: "1,5–2,0", range: { min: 1.5, max: 2 } },
  { label: "1,8–2,2", range: { min: 1.8, max: 2.2 } },
  { label: "2,0–3,0", range: { min: 2, max: 3 } },
  { label: "3,0+", range: { min: 3, max: 0 } },
  { label: "5+", range: { min: 5, max: 0 } },
  { label: "10+", range: { min: 10, max: 0 } },
];

const same = (a: OddsRange, b: OddsRange) => a.min === b.min && a.max === b.max;
const fmt = (n: number) => (n ? String(n).replace(".", ",") : "");
const parse = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n > 1 ? Math.round(n * 100) / 100 : 0;
};

/**
 * "Kun odds mellem X og Y" — filters the list on the best price, instantly, and
 * remembers the choice. Presets for the common ranges, free fields for the rest.
 */
export function OddsRangeFilter({
  value,
  onChange,
}: {
  value: OddsRange;
  onChange: (r: OddsRange) => void;
}) {
  const router = useRouter();
  const [saving, startSaving] = React.useTransition();
  const lastSaved = React.useRef(value);
  // The fields keep the raw text while typing; the list updates as soon as it parses.
  const [minText, setMinText] = React.useState(fmt(value.min));
  const [maxText, setMaxText] = React.useState(fmt(value.max));

  const save = (next: OddsRange) => {
    if (same(next, lastSaved.current)) return;
    lastSaved.current = next;
    startSaving(async () => {
      await updateSettingsAction({ minOdds: next.min, maxOdds: next.max });
      router.refresh();
    });
  };

  const apply = (next: OddsRange, commit = true) => {
    onChange(next);
    setMinText(fmt(next.min));
    setMaxText(fmt(next.max));
    if (commit) save(next);
  };

  const invalid = value.min > 0 && value.max > 0 && value.min > value.max;

  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-line/60 bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="shrink-0 text-[12.5px] font-medium text-fg">Kun odds mellem</span>
        <div className="flex items-center gap-2">
          <input
            inputMode="decimal"
            aria-label="Laveste odds"
            placeholder="fra"
            value={minText}
            onChange={(e) => {
              setMinText(e.target.value);
              onChange({ min: parse(e.target.value), max: value.max });
            }}
            onBlur={() => save(value)}
            className="tabular h-8 w-16 rounded-full border border-line/70 bg-surface-2 px-3 text-center text-[12.5px] text-fg outline-none focus-visible:border-primary"
          />
          <span className="text-subtle">og</span>
          <input
            inputMode="decimal"
            aria-label="Højeste odds"
            placeholder="til"
            value={maxText}
            onChange={(e) => {
              setMaxText(e.target.value);
              onChange({ min: value.min, max: parse(e.target.value) });
            }}
            onBlur={() => save(value)}
            className="tabular h-8 w-16 rounded-full border border-line/70 bg-surface-2 px-3 text-center text-[12.5px] text-fg outline-none focus-visible:border-primary"
          />
        </div>
        <span className="text-[11px] text-subtle" aria-live="polite">
          {invalid ? "Laveste odds skal være under højeste" : saving ? "Gemmer…" : "Gemmes som dit standardvalg"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => apply(p.range)}
            aria-pressed={same(value, p.range)}
            className={cn(
              "cursor-pointer rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
              same(value, p.range)
                ? "border-primary/50 bg-primary/12 text-primary-strong"
                : "border-line/70 bg-surface-2 text-muted hover:border-line-strong hover:text-fg",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
