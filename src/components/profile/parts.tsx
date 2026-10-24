"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Small building blocks shared by every tab of the profile, so the tabs feel like
 * one system: a header, labelled groups, a styled slider, a threshold chart,
 * metric tiles and "setting rows".
 */

export function SectionHeader({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <CardHeader className="flex-row items-start gap-3.5 pb-4">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-[12px] bg-primary/10 text-primary-strong ring-1 ring-inset ring-primary/20">
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <span className="flex flex-col gap-1">
        <CardTitle className="text-[15px]">{title}</CardTitle>
        <CardDescription className="text-[12.5px] leading-relaxed">{desc}</CardDescription>
      </span>
    </CardHeader>
  );
}

export function Group({
  title,
  hint,
  aside,
  children,
  className,
}: {
  title: string;
  hint?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-sans text-[13px] font-semibold tracking-tight text-fg">
            {title}
          </h4>
          {hint && <p className="mt-0.5 text-[11.5px] leading-relaxed text-subtle">{hint}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

/** A softly raised panel for grouping controls inside a tab. */
export function Panel({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "accent" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-card border p-4",
        tone === "default" && "border-line/60 bg-surface-2/35",
        tone === "accent" && "border-primary/25 bg-primary/[0.05]",
        tone === "danger" && "border-negative/25 bg-negative/[0.04]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Metric({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "neutral" | "positive" | "negative" | "warning" | "primary";
}) {
  return (
    <div className="rounded-card border border-line/60 bg-bg/40 px-3.5 py-3">
      <p className="text-[10.5px] font-medium text-subtle">{label}</p>
      <p
        className={cn(
          "tabular mt-1 text-[19px] font-semibold leading-none tracking-tight",
          tone === "neutral" && "text-fg",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          tone === "warning" && "text-warning",
          tone === "primary" && "text-primary-strong",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1.5 text-[11px] leading-snug text-subtle">{sub}</p>}
    </div>
  );
}

/**
 * Slider with a live value read-out. `format` renders the value; `marks` are
 * optional labelled ticks underneath ("0%", "5%", …).
 */
export function SliderField({
  id,
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  format,
  marks,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  marks?: { value: number; label: string }[];
}) {
  const clamped = Math.min(max, Math.max(min, value));
  const pct = ((clamped - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[12.5px] font-medium text-fg">
          {label}
        </label>
        <output
          htmlFor={id}
          className="tabular rounded-full bg-primary/10 px-2.5 py-0.5 text-[12px] font-semibold text-primary-strong"
        >
          {format(clamped)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--pct": pct } as React.CSSProperties}
      />
      {marks && (
        <div className="relative mt-0.5 h-4 text-[10px] text-subtle">
          {marks.map((m) => (
            <span
              key={m.value}
              className="tabular absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full"
              style={{ left: `${((m.value - min) / (max - min)) * 100}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      )}
      {hint && <p className="mt-2 text-[11.5px] leading-relaxed text-subtle">{hint}</p>}
    </div>
  );
}

/**
 * "Hvad bliver der tilbage?" — how many of today's opportunities sit at each
 * edge level, with everything under the chosen threshold dimmed. Makes an
 * abstract cut-off tangible.
 */
export function ThresholdChart({
  edges,
  threshold,
  className,
}: {
  /** Each value bet's EV as a fraction (0.05 = +5 %). */
  edges: number[];
  /** Cut-off as a fraction. */
  threshold: number;
  className?: string;
}) {
  const bins = [
    { from: 0, to: 0.02, label: "0–2" },
    { from: 0.02, to: 0.03, label: "2–3" },
    { from: 0.03, to: 0.04, label: "3–4" },
    { from: 0.04, to: 0.05, label: "4–5" },
    { from: 0.05, to: 0.07, label: "5–7" },
    { from: 0.07, to: Infinity, label: "7+" },
  ].map((b) => ({
    ...b,
    count: edges.filter((e) => e >= b.from && e < b.to).length,
  }));
  const max = Math.max(1, ...bins.map((b) => b.count));
  const kept = edges.filter((e) => e >= threshold).length;

  return (
    <div className={className}>
      <div className="flex h-24 items-end gap-2" role="img" aria-label={`${kept} af ${edges.length} value bets passerer grænsen`}>
        {bins.map((b) => {
          const passes = b.from >= threshold - 1e-9 || b.to > threshold + 1e-9;
          const fullyPasses = b.from >= threshold - 1e-9;
          return (
            <div key={b.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="tabular text-[10.5px] text-subtle">{b.count}</span>
              <div className="flex h-16 w-full items-end">
                <div
                  className={cn(
                    "w-full rounded-t-[7px] transition-[height,background-color,opacity] duration-300",
                    fullyPasses
                      ? "bg-primary"
                      : passes
                        ? "bg-primary/55"
                        : "bg-line-strong/70",
                  )}
                  style={{ height: `${Math.max(b.count ? 10 : 3, (b.count / max) * 100)}%` }}
                />
              </div>
              <span className="tabular text-[10px] text-subtle">{b.label}%</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-muted">
        <span className="tabular font-semibold text-fg">{kept}</span> af{" "}
        <span className="tabular">{edges.length}</span> value bets i dag passerer din grænse.
      </p>
    </div>
  );
}

/** Label + description on the left, control on the right, hairline between rows. */
export function SettingRow({
  title,
  desc,
  control,
  children,
}: {
  title: string;
  desc?: string;
  control?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-line/50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-fg">{title}</p>
          {desc && <p className="mt-0.5 text-[11.5px] leading-relaxed text-subtle">{desc}</p>}
        </div>
        {control && <div className="shrink-0">{control}</div>}
      </div>
      {children}
    </div>
  );
}

/** Pill-shaped quick choice (e.g. 500 / 1.000 / 2.000 kr.). */
export function QuickChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "glow-hover tabular rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors",
        active
          ? "border-primary/50 bg-primary/12 text-primary-strong"
          : "border-line/70 bg-surface-2/50 text-muted hover:border-line-strong hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
