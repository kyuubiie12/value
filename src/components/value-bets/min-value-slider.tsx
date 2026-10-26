"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { updateSettingsAction } from "@/lib/actions";

const MAX = 0.3;
const STEP = 0.005;
/** One-tap choices for people who only want the big edges. */
const PRESETS = [0, 0.05, 0.1, 0.15, 0.25];

/**
 * "Minimum value" — always visible above the feed. Moving it filters the list
 * instantly; letting go saves it as the user's standing minimum (the same setting
 * as on the profile) and re-reads the feed, so lowering it can bring in smaller
 * edges the server had hidden.
 */
export function MinValueSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const router = useRouter();
  const [saving, startSaving] = React.useTransition();
  const lastSaved = React.useRef(value);

  const save = (v: number) => {
    if (lastSaved.current === v) return;
    lastSaved.current = v;
    startSaving(async () => {
      await updateSettingsAction({ minEdge: v });
      router.refresh();
    });
  };

  const choose = (v: number) => {
    onChange(v);
    save(v);
  };

  const pct = (Math.min(MAX, value) / MAX) * 100;

  return (
    <div className="flex h-full flex-col gap-4 rounded-card border border-line/60 bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="feed-min-value" className="text-[13px] font-semibold text-fg">
          Minimum value
        </label>
        <output
          htmlFor="feed-min-value"
          className="tabular rounded-full bg-primary/10 px-2.5 py-0.5 text-[12px] font-semibold text-primary-strong"
        >
          {value === 0 ? "Alle" : `${formatPercent(value, { digits: 1 })} EV`}
        </output>
      </div>

      <input
        id="feed-min-value"
        type="range"
        className="range w-full"
        min={0}
        max={MAX}
        step={STEP}
        value={Math.min(MAX, value)}
        onChange={(e) => onChange(Number(Number(e.target.value).toFixed(3)))}
        onPointerUp={() => save(value)}
        onKeyUp={() => save(value)}
        onBlur={() => save(value)}
        style={{ "--pct": pct } as React.CSSProperties}
      />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Hurtigvalg for value">
        {PRESETS.map((v) => {
          const on = Math.abs(value - v) < 0.0005;
          return (
            <button
              key={v}
              type="button"
              onClick={() => choose(v)}
              aria-pressed={on}
              className={cn(
                "h-8 cursor-pointer rounded-full border px-3 text-[12px] font-medium transition-colors",
                on
                  ? "border-primary/50 bg-primary/12 text-primary-strong"
                  : "border-line/70 bg-surface-2 text-muted hover:border-line-strong hover:text-fg",
              )}
            >
              {v === 0 ? "Alle" : `${Math.round(v * 100)} %+`}
            </button>
          );
        })}
      </div>

      <p className="mt-auto text-[11px] text-subtle" aria-live="polite">
        {saving ? "Gemmer…" : "Gemmes som dit standardvalg"}
      </p>
    </div>
  );
}
