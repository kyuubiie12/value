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
 * "Odds" — filters the list on the best price, instantly, and remembers the choice.
 * Presets for the common ranges (and high odds), free fields for the rest.
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
  const summary =
    value.min === 0 && value.max === 0
      ? "Alle odds"
      : value.max === 0
        ? `Fra ${fmt(value.min)}`
        : value.min === 0
          ? `Op til ${fmt(value.max)}`
          : `${fmt(value.min)} – ${fmt(value.max)}`;

  const field =
    "tabular h-8 w-[72px] rounded-full border border-line/70 bg-surface-2 px-3 text-center text-[12.5px] text-fg outline-none placeholder:text-subtle focus-visible:border-primary";

  return (
    <div className="flex h-full flex-col gap-4 rounded-card border border-line/60 bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-fg">Odds</span>
        <span className="tabular rounded-full bg-primary/10 px-2.5 py-0.5 text-[12px] font-semibold text-primary-strong">
          {summary}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Hurtigvalg for odds">
        {PRESETS.map((p) => {
          const on = same(value, p.range);
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => apply(p.range)}
              aria-pressed={on}
              className={cn(
                "h-8 cursor-pointer rounded-full border px-3 text-[12px] font-medium transition-colors",
                on
                  ? "border-primary/50 bg-primary/12 text-primary-strong"
                  : "border-line/70 bg-surface-2 text-muted hover:border-line-strong hover:text-fg",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[12px] text-subtle">
        <span>Eller skriv selv:</span>
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
          className={field}
        />
        <span>til</span>
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
          className={field}
        />
      </div>

      <p className="mt-auto text-[11px] text-subtle" aria-live="polite">
        {invalid ? "Laveste odds skal være under højeste" : saving ? "Gemmer…" : "Gemmes som dit standardvalg"}
      </p>
    </div>
  );
}
