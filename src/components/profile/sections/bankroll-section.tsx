"use client";

import * as React from "react";
import { Check, Coins } from "lucide-react";
import type { PortfolioStats, UnitMode, UserSettings } from "@/types";
import { suggestedStake } from "@/lib/betting-math";
import { formatCurrency, formatNumber, formatOdds, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Group, Metric, Panel, QuickChip, SectionHeader } from "../parts";
import type { FeedPulse, SetSetting } from "../types";

const RISK = [
  { value: 0.1, label: "Forsigtig", kelly: "⅒ Kelly", desc: "Små indsatser, rolige udsving", bars: 1 },
  { value: 0.25, label: "Balanceret", kelly: "¼ Kelly", desc: "Standard — god balance", bars: 2, recommended: true },
  { value: 0.5, label: "Offensiv", kelly: "½ Kelly", desc: "Større indsatser, større udsving", bars: 3 },
  { value: 1, label: "Fuld Kelly", kelly: "1× Kelly", desc: "Matematisk maksimum — meget svingende", bars: 4 },
] as const;

/** The value bet that sits in the middle of today's feed — a fair "typical" example. */
function typicalBet(pulse: FeedPulse[]): FeedPulse | null {
  if (!pulse.length) return null;
  const sorted = [...pulse].sort((a, b) => a.ev - b.ev);
  return sorted[Math.floor(sorted.length / 2)];
}

export function BankrollSection({
  form,
  set,
  stats,
  pulse,
}: {
  form: UserSettings;
  set: SetSetting;
  stats: PortfolioStats;
  pulse: FeedPulse[];
}) {
  const bankroll = stats.bankroll;
  const unitValue =
    form.unitMode === "fixed" ? form.unitSize : (bankroll * form.unitSize) / 100;
  const risk = RISK.find((r) => r.value === form.kellyFraction);
  const typical = typicalBet(pulse);
  const stakeFor = (kellyMultiplier: number) =>
    typical
      ? suggestedStake(typical.kelly, kellyMultiplier, bankroll, form.stakeRounding)
      : 0;
  const stake = stakeFor(form.kellyFraction);

  return (
    <Card>
      <SectionHeader
        icon={Coins}
        title="Bankroll & units"
        desc="Din kapital, hvad én unit svarer til, og hvor aggressivt indsatserne foreslås"
      />
      <CardContent className="flex flex-col gap-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Bankroll nu"
            value={formatCurrency(bankroll, form.currency)}
            sub={`Start: ${formatCurrency(form.startingBankroll, form.currency)}`}
          />
          <Metric
            label="1 unit"
            value={formatCurrency(unitValue, form.currency)}
            sub={`${formatPercent(unitValue / bankroll, { digits: 1 })} af bankroll`}
          />
          <Metric
            label="Risikoprofil"
            value={risk?.label ?? "Tilpasset"}
            tone="primary"
            sub={risk?.kelly ?? `${formatNumber(form.kellyFraction, 2)}× Kelly`}
          />
        </div>

        <Group
          title="Risikoprofil"
          hint="Hvor stor en del af Kelly-anbefalingen du faktisk spiller. Lavere = færre og mindre udsving."
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {RISK.map((r) => {
              const on = form.kellyFraction === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set("kellyFraction", r.value)}
                  aria-pressed={on}
                  className={cn(
                    "glow-hover flex flex-col gap-3 rounded-card border p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-200",
                    on
                      ? "border-primary/55 bg-primary/[0.07] shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary)_13%,transparent)]"
                      : "border-line/70 bg-surface-2/40 hover:border-line-strong",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
                      {r.label}
                      {on && <Check className="size-3.5 text-primary-strong" strokeWidth={3} />}
                    </span>
                    <span className="flex items-end gap-[3px]" aria-hidden>
                      {[1, 2, 3, 4].map((n) => (
                        <span
                          key={n}
                          className={cn(
                            "w-1 rounded-full",
                            n <= r.bars ? "bg-primary" : "bg-line-strong/70",
                          )}
                          style={{ height: 5 + n * 3 }}
                        />
                      ))}
                    </span>
                  </span>
                  <span className="text-[11.5px] leading-snug text-subtle">{r.desc}</span>
                  <span className="mt-auto flex items-center justify-between border-t border-line/50 pt-2.5 text-[11px]">
                    <span className="text-subtle">
                      {r.kelly}
                      {"recommended" in r && r.recommended && (
                        <span className="ml-1.5 rounded-full bg-primary/12 px-1.5 py-px text-[9.5px] font-semibold text-primary-strong">
                          Anbefalet
                        </span>
                      )}
                    </span>
                    {typical && (
                      <span className="tabular font-medium text-muted">
                        {formatCurrency(stakeFor(r.value), form.currency)}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </Group>

        <Panel tone="accent">
          <p className="text-[11px] font-medium text-subtle">Sådan ville det se ud på et typisk value bet</p>
          {typical ? (
            <>
              <p className="mt-1 text-[13px] text-muted">
                <span className="font-medium text-fg">{typical.event}</span> · odds{" "}
                <span className="tabular text-fg">{formatOdds(typical.odds)}</span> · value{" "}
                <span className="tabular text-positive">
                  {formatPercent(typical.ev, { signed: true })}
                </span>
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
                <div>
                  <p className="tabular font-display text-[34px] font-semibold leading-none text-fg">
                    {formatCurrency(stake, form.currency)}
                  </p>
                  <p className="mt-1.5 text-[11.5px] text-subtle">anbefalet indsats</p>
                </div>
                <div className="flex gap-6 pb-0.5">
                  <div>
                    <p className="tabular text-[15px] font-semibold text-fg">
                      {formatNumber(stake / unitValue, 1)}
                    </p>
                    <p className="text-[11px] text-subtle">units</p>
                  </div>
                  <div>
                    <p className="tabular text-[15px] font-semibold text-fg">
                      {formatPercent(stake / bankroll, { digits: 1 })}
                    </p>
                    <p className="text-[11px] text-subtle">af bankroll</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${Math.min(100, Math.max(3, (stake / bankroll) * 100 * 6))}%` }}
                />
              </div>
            </>
          ) : (
            <p className="mt-1 text-[12.5px] text-subtle">
              Der er ingen value bets i feedet lige nu — så snart der er, vises et eksempel her.
            </p>
          )}
        </Panel>

        <Group title="Units & beløb">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[12.5px] font-medium text-fg">Unit-model</span>
              <Segmented<UnitMode>
                value={form.unitMode}
                onChange={(v) => set("unitMode", v)}
                options={[
                  { value: "fixed", label: "Fast beløb" },
                  { value: "percentage", label: "% af bankroll" },
                ]}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label={`Startkapital (${form.currency})`}
                htmlFor="p-bankroll"
              >
                <Input
                  id="p-bankroll"
                  type="number"
                  step="500"
                  value={form.startingBankroll}
                  onChange={(e) => set("startingBankroll", Number(e.target.value))}
                  className="tabular"
                />
              </Field>
              <Field
                label={form.unitMode === "fixed" ? `1 unit (${form.currency})` : "1 unit (% af bankroll)"}
                htmlFor="p-unit-size"
                hint={
                  form.unitMode === "fixed"
                    ? `= ${formatNumber((form.unitSize / bankroll) * 100, 1)} % af bankroll`
                    : `= ${formatCurrency(unitValue, form.currency)}`
                }
              >
                <Input
                  id="p-unit-size"
                  type="number"
                  step={form.unitMode === "fixed" ? "10" : "0.5"}
                  value={form.unitSize}
                  onChange={(e) => set("unitSize", Number(e.target.value))}
                  className="tabular"
                />
              </Field>
              <Field
                label="Standard-indsats (units)"
                htmlFor="p-units"
                hint="Forudfyldes når du logger et spil selv"
              >
                <Input
                  id="p-units"
                  type="number"
                  step="0.25"
                  min="0"
                  value={form.defaultStakeUnits}
                  onChange={(e) => set("defaultStakeUnits", Number(e.target.value))}
                  className="tabular"
                />
              </Field>
            </div>

            <div>
              <p className="mb-2 text-[12.5px] font-medium text-fg">
                Afrund anbefalet indsats til nærmeste
              </p>
              <div className="flex flex-wrap gap-2">
                {[1, 5, 10, 25, 50].map((n) => (
                  <QuickChip
                    key={n}
                    active={form.stakeRounding === n}
                    onClick={() => set("stakeRounding", n)}
                  >
                    {n} {form.currency}
                  </QuickChip>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] text-subtle">
                Gør de foreslåede indsatser til pæne tal, som kan lægges ind hos bookmakeren.
              </p>
            </div>
          </div>
        </Group>
      </CardContent>
    </Card>
  );
}
