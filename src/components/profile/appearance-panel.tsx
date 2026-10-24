"use client";

import * as React from "react";
import { Check, Monitor, Moon, RotateCcw, Sparkles, Sun } from "lucide-react";
import type { DisplayFont, ThemeMode } from "@/types";
import {
  ACCENT_OPTIONS,
  APPEARANCE_DEFAULTS,
  CORNER_OPTIONS,
  GLOW_OPTIONS,
  SURFACE_OPTIONS,
  type AppearanceValues,
} from "@/lib/appearance";
import { cn } from "@/lib/utils";
import { LeagueCode } from "@/components/shared/league-badge";
import { ValueBar } from "@/components/value-bets/value-bar";
import { Switch } from "@/components/ui/switch";

const THEMES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "Mørk", icon: Moon },
  { value: "light", label: "Lys", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

const FONTS: {
  value: DisplayFont;
  label: string;
  desc: string;
  family: string;
  upper?: boolean;
}[] = [
  { value: "grotesk", label: "Moderne", desc: "Space Grotesk — ren og afbalanceret", family: "var(--font-grotesk)" },
  { value: "oswald", label: "Stadion", desc: "Oswald — smal, klassisk sports-look", family: "var(--font-oswald)", upper: true },
  { value: "teko", label: "Måltavle", desc: "Teko — kompakt, som en scoreboard", family: "var(--font-teko)", upper: true },
  { value: "rajdhani", label: "Turbo", desc: "Rajdhani — teknisk og kantet", family: "var(--font-rajdhani)", upper: true },
  { value: "anton", label: "Mesterskab", desc: "Anton — massiv og højlydt", family: "var(--font-anton)", upper: true },
];

/**
 * The "Udseende" settings. Everything here previews live across the whole app —
 * the parent applies each change to `<html>` as it happens and persists on Gem.
 * The mini card at the top is built from the real tokens, so it reacts too.
 */
export function AppearancePanel({
  value,
  onChange,
}: {
  value: AppearanceValues;
  onChange: (patch: Partial<AppearanceValues>) => void;
}) {
  const isDefault = (Object.keys(APPEARANCE_DEFAULTS) as (keyof AppearanceValues)[]).every(
    (k) => value[k] === APPEARANCE_DEFAULTS[k],
  );
  const lightActive = value.theme === "light";

  return (
    <div className="flex flex-col gap-8">
      <PreviewCard />

      <Group label="Tema">
        <div className="grid grid-cols-3 gap-2.5">
          {THEMES.map((t) => (
            <Tile
              key={t.value}
              on={value.theme === t.value}
              onClick={() => onChange({ theme: t.value })}
            >
              <ThemeThumb mode={t.value} />
              <TileLabel on={value.theme === t.value} icon={<t.icon className="size-3.5" />}>
                {t.label}
              </TileLabel>
            </Tile>
          ))}
        </div>
      </Group>

      <Group label="Accentfarve" hint="Bruges sparsomt — til værdi og den ene hovedhandling.">
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
          {ACCENT_OPTIONS.map((a) => {
            const on = value.accent === a.value;
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => onChange({ accent: a.value })}
                aria-pressed={on}
                aria-label={a.label}
                className={cn(
                  "group flex flex-col items-center gap-2 rounded-card border px-1 py-3 transition-[border-color,background-color,box-shadow] duration-200",
                  on
                    ? "border-primary/50 bg-primary/[0.07]"
                    : "border-line/70 bg-surface-2/40 hover:border-line-strong",
                )}
              >
                <span
                  aria-hidden
                  className="grid size-8 place-items-center rounded-full ring-1 ring-inset ring-black/15 transition-transform duration-200 group-hover:scale-110"
                  style={{
                    backgroundColor: a.dot,
                    boxShadow: on ? `0 0 0 3px color-mix(in oklab, ${a.dot} 28%, transparent), 0 6px 18px -4px ${a.dot}` : undefined,
                  }}
                >
                  {on && <Check className="size-4 text-black/70" strokeWidth={3} />}
                </span>
                <span className="text-[11px] font-medium text-muted group-hover:text-fg">
                  {a.label}
                </span>
              </button>
            );
          })}
        </div>
      </Group>

      <Group
        label="Baggrund"
        hint={lightActive ? "Gælder det mørke tema — vælg Mørk eller System for at se det." : "Tonen på siden og fladerne i det mørke tema."}
      >
        <div className={cn("grid grid-cols-3 gap-2.5 transition-opacity", lightActive && "opacity-50")}>
          {SURFACE_OPTIONS.map((s) => {
            const on = value.surface === s.value;
            return (
              <Tile key={s.value} on={on} onClick={() => onChange({ surface: s.value })}>
                <span
                  aria-hidden
                  className="flex h-14 w-full items-end gap-1.5 overflow-hidden rounded-[10px] p-2 ring-1 ring-inset ring-white/10"
                  style={{ background: s.swatch[0] }}
                >
                  <span className="h-8 flex-1 rounded-md" style={{ background: s.swatch[1] }} />
                  <span className="h-5 w-6 rounded-md" style={{ background: s.swatch[2] }} />
                </span>
                <TileLabel on={on}>{s.label}</TileLabel>
                <span className="-mt-1 text-[10.5px] leading-snug text-subtle">{s.desc}</span>
              </Tile>
            );
          })}
        </div>
      </Group>

      <div className="grid gap-8 sm:grid-cols-2">
        <Group label="Hjørner">
          <div className="grid grid-cols-3 gap-2.5">
            {CORNER_OPTIONS.map((c) => {
              const on = value.corners === c.value;
              return (
                <Tile key={c.value} on={on} onClick={() => onChange({ corners: c.value })}>
                  <span
                    aria-hidden
                    className="h-11 border-l-[3px] border-t-[3px] border-primary bg-gradient-to-br from-primary/20 to-transparent"
                    style={{ borderTopLeftRadius: c.r * 2 + 2 }}
                  />
                  <TileLabel on={on}>{c.label}</TileLabel>
                </Tile>
              );
            })}
          </div>
        </Group>

        <Group label="Lys & glød" hint="Lyset der følger musen over kort og knapper.">
          <div className="grid grid-cols-3 gap-2.5">
            {GLOW_OPTIONS.map((g, i) => {
              const on = value.glow === g.value;
              return (
                <Tile key={g.value} on={on} onClick={() => onChange({ glow: g.value })}>
                  <span
                    aria-hidden
                    className="size-9 rounded-full bg-primary/80"
                    style={{
                      boxShadow:
                        i === 0
                          ? "none"
                          : `0 0 ${i === 1 ? 14 : 26}px ${i === 1 ? 2 : 7}px color-mix(in oklab, var(--color-primary) ${i === 1 ? 38 : 62}%, transparent)`,
                      opacity: i === 0 ? 0.35 : 1,
                    }}
                  />
                  <TileLabel on={on}>{g.label}</TileLabel>
                </Tile>
              );
            })}
          </div>
        </Group>
      </div>

      <Group label="Skrifttype" hint="Til overskrifter, kampnavne og de store tal.">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {FONTS.map((f) => {
            const on = value.displayFont === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => onChange({ displayFont: f.value })}
                aria-pressed={on}
                className={cn(
                  "glow-hover flex items-center justify-between gap-4 rounded-card border px-4 py-3.5 text-left transition-colors",
                  on
                    ? "border-primary/50 bg-primary/[0.07]"
                    : "border-line/70 bg-surface-2/40 hover:border-line-strong",
                )}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-fg">
                    {f.label}
                    {on && <Check className="size-3.5 text-primary-strong" strokeWidth={3} />}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-subtle">{f.desc}</span>
                </span>
                <span
                  aria-hidden
                  className={cn("shrink-0 leading-none text-fg", f.upper ? "text-[24px]" : "text-[21px]")}
                  style={{
                    fontFamily: f.family,
                    letterSpacing: f.upper ? "0.01em" : "-0.02em",
                    textTransform: f.upper ? "uppercase" : "none",
                    fontWeight: f.value === "anton" ? 400 : 600,
                  }}
                >
                  Odds
                </span>
              </button>
            );
          })}
        </div>
      </Group>

      <div className="flex flex-col gap-4 border-t border-line/60 pt-6">
        <Switch
          checked={value.animations}
          onChange={(v) => onChange({ animations: v })}
          label="Animationer"
          description="Kort der glider ind, bløde overgange og lys-effekter. Slås automatisk fra hvis dit system beder om mindre bevægelse."
        />
        <button
          type="button"
          onClick={() => onChange(APPEARANCE_DEFAULTS)}
          disabled={isDefault}
          className="glow-hover inline-flex w-fit items-center gap-1.5 rounded-full border border-line/70 bg-surface-2/50 px-4 py-2 text-[12px] font-medium text-muted transition-colors hover:text-fg disabled:pointer-events-none disabled:opacity-40"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Nulstil udseende
        </button>
        <p className="text-[11px] text-subtle">
          Ændringer vises med det samme — tryk Gem for at beholde dem.
        </p>
      </div>
    </div>
  );
}

function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <h4 className="font-sans text-[13px] font-semibold tracking-tight text-fg">{label}</h4>
        {hint && <p className="text-[11.5px] text-subtle">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Tile({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "glow-hover flex flex-col items-start gap-2.5 rounded-card border p-2.5 text-left transition-[border-color,background-color,box-shadow] duration-200",
        "[&>:first-child]:self-stretch",
        on
          ? "border-primary/55 bg-primary/[0.07] shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary)_14%,transparent)]"
          : "border-line/70 bg-surface-2/40 hover:border-line-strong",
      )}
    >
      {children}
    </button>
  );
}

function TileLabel({
  on,
  icon,
  children,
}: {
  on: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 px-0.5 text-[12px] font-medium text-fg">
      {icon && <span className="text-subtle">{icon}</span>}
      {children}
      {on && <Check className="size-3.5 text-primary-strong" strokeWidth={3} />}
    </span>
  );
}

type Palette = { bg: string; card: string; line: string; ink: string };
const DARK_PAL: Palette = { bg: "#0b0e15", card: "#161c29", line: "#262e3e", ink: "#3a4457" };
const LIGHT_PAL: Palette = { bg: "#eceff3", card: "#ffffff", line: "#dce0e7", ink: "#c1c7d2" };

function ThemePane({ c }: { c: Palette }) {
  return (
    <span className="block h-full w-full p-2" style={{ background: c.bg }}>
      <span className="block h-1.5 w-9 rounded-full" style={{ background: c.ink }} />
      <span
        className="mt-1.5 block rounded-[7px] p-1.5"
        style={{ background: c.card, boxShadow: `inset 0 0 0 1px ${c.line}` }}
      >
        <span className="block h-1 w-12 rounded-full" style={{ background: c.ink }} />
        <span className="mt-1.5 flex items-center gap-1.5">
          <span className="h-3 w-7 rounded-[4px]" style={{ background: c.ink }} />
          <span className="h-1 flex-1 rounded-full bg-primary" />
        </span>
      </span>
    </span>
  );
}

/** Miniature app window — fixed colours so each tile shows its own theme. */
function ThemeThumb({ mode }: { mode: ThemeMode }) {
  return (
    <span aria-hidden className="relative block h-[68px] overflow-hidden rounded-[10px] ring-1 ring-inset ring-white/10">
      <ThemePane c={mode === "light" ? LIGHT_PAL : DARK_PAL} />
      {mode === "system" && (
        <span
          className="absolute inset-0 block"
          style={{ clipPath: "polygon(56% 0, 100% 0, 100% 100%, 36% 100%)" }}
        >
          <ThemePane c={LIGHT_PAL} />
        </span>
      )}
    </span>
  );
}

/** A real card built from live tokens, so every picker above visibly changes it. */
function PreviewCard() {
  return (
    <div className="relative overflow-hidden rounded-card-lg border border-line/60 bg-bg/60 p-4 sm:p-5">
      <span className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-subtle">
        <Sparkles className="size-3 text-primary" aria-hidden />
        Forhåndsvisning
      </span>
      <div className="spot rounded-card border border-line/60 bg-surface p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <LeagueCode code="UCL" />
            <p className="fixture-name truncate text-[15px] text-fg">
              Real Madrid
              <span className="mx-1.5 font-normal text-subtle">vs</span>
              Liverpool
            </p>
          </div>
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
        </div>
        <p className="mt-1 text-[13px] text-muted">
          <span className="font-medium text-fg">Over 3.5 mål</span>
          <span className="text-subtle"> · Mål over/under 3.5</span>
        </p>
        <div className="mt-3.5 flex items-center gap-4">
          <span className="tabular text-[28px] font-bold leading-none tracking-tight text-primary-strong">
            2,90
          </span>
          <ValueBar fairOdds={2.62} edge={0.105} className="min-w-0 flex-1" />
        </div>
        <div className="mt-3.5 flex items-center justify-between border-t border-line/60 pt-3">
          <span className="text-[11px] text-subtle">Anbefalet 190 kr. · fair 2,62</span>
          <span className="glow-hover rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-strong">
            + Spiller med
          </span>
        </div>
      </div>
      <p className="mt-2.5 text-[11px] text-subtle">
        Hold musen over kortet — det er her lyset og kanten ses.
      </p>
    </div>
  );
}
