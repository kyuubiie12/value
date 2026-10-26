"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatPercent } from "@/lib/format";
import { updateSettingsAction } from "@/lib/actions";

const MAX = 0.3;
/** One-tap choices for people who only want the big edges. */
const PRESETS = [0, 0.05, 0.1, 0.15, 0.25];
const STEP = 0.005;

/**
 * "Vis kun value over X %" — always visible above the feed. Moving it filters
 * the list instantly; letting go saves it as the user's standing minimum (the
 * same setting as on the profile) and re-reads the feed, so lowering it can
 * bring in smaller edges the server had hidden.
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

  const commit = () => {
    if (lastSaved.current === value) return;
    lastSaved.current = value;
    startSaving(async () => {
      await updateSettingsAction({ minEdge: value });
      router.refresh();
    });
  };

  const choose = (v: number) => {
    onChange(v);
    lastSaved.current = v;
    startSaving(async () => {
      await updateSettingsAction({ minEdge: v });
      router.refresh();
    });
  };

  const pct = (Math.min(MAX, value) / MAX) * 100;

  return (
    <div className="flex flex-col gap-1.5 rounded-card border border-line/60 bg-surface px-4 py-3 sm:flex-row sm:items-center sm:gap-5">
      <label htmlFor="feed-min-value" className="shrink-0 text-[12.5px] font-medium text-fg">
        Vis kun value over
      </label>
      <input
        id="feed-min-value"
        type="range"
        className="range sm:max-w-md"
        min={0}
        max={MAX}
        step={STEP}
        value={Math.min(MAX, value)}
        onChange={(e) => onChange(Number(Number(e.target.value).toFixed(3)))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        style={{ "--pct": pct } as React.CSSProperties}
      />
      <output
        htmlFor="feed-min-value"
        className="tabular w-fit shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[12px] font-semibold text-primary-strong"
      >
        {value === 0 ? "Alle" : `${formatPercent(value, { digits: 1 })} EV`}
      </output>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Hurtigvalg">
        {PRESETS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => choose(v)}
            aria-pressed={Math.abs(value - v) < 0.0005}
            className={
              "h-7 rounded-full border px-2.5 text-[11.5px] font-medium transition-colors " +
              (Math.abs(value - v) < 0.0005
                ? "border-primary/45 bg-primary/12 text-primary-strong"
                : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg")
            }
          >
            {v === 0 ? "Alle" : `${Math.round(v * 100)} %+`}
          </button>
        ))}
      </div>
      <span className="text-[11px] text-subtle" aria-live="polite">
        {saving ? "Gemmer…" : "Gemmes som dit standardvalg"}
      </span>
    </div>
  );
}
