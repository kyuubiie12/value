"use client";

import * as React from "react";
import { ExternalLink, HeartHandshake, ShieldCheck } from "lucide-react";
import type { UserSettings } from "@/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Group, Metric, Panel, QuickChip, SectionHeader } from "../parts";
import type { SetSetting } from "../types";

const LIMIT_PRESETS = [500, 1000, 2000, 5000];

const HELP_LINKS = [
  {
    href: "https://www.stopspillet.dk",
    title: "StopSpillet",
    desc: "Gratis og anonym rådgivning om spilleproblemer",
  },
  {
    href: "https://www.rofus.nu",
    title: "ROFUS",
    desc: "Registrér dig selv som udelukket fra online spil",
  },
  {
    href: "https://www.spillemyndigheden.dk",
    title: "Spillemyndigheden",
    desc: "Regler, tilladelser og dine rettigheder som spiller",
  },
];

export function AnsvarSection({
  form,
  set,
  stakedThisWeek,
}: {
  form: UserSettings;
  set: SetSetting;
  stakedThisWeek: number;
}) {
  const limitOn = form.weeklyStakeLimit > 0;
  const pct = limitOn ? Math.min(1, stakedThisWeek / form.weeklyStakeLimit) : 0;
  const status = !limitOn
    ? { label: "Ingen grænse", tone: "neutral" as const }
    : pct >= 1
      ? { label: "Grænsen er nået", tone: "negative" as const }
      : pct >= 0.8
        ? { label: "Tæt på grænsen", tone: "warning" as const }
        : { label: "Inden for grænsen", tone: "positive" as const };

  return (
    <Card>
      <SectionHeader
        icon={ShieldCheck}
        title="Ansvarligt spil"
        desc="Sæt dine egne grænser — ValueBet AI placerer aldrig væddemål for dig"
      />
      <CardContent className="flex flex-col gap-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Spillet de seneste 7 dage"
            value={formatCurrency(stakedThisWeek, form.currency)}
          />
          <Metric
            label="Ugentlig grænse"
            value={limitOn ? formatCurrency(form.weeklyStakeLimit, form.currency) : "Ingen"}
            sub={limitOn ? undefined : "Vælg en grænse nedenfor"}
          />
          <Metric
            label="Status"
            value={status.label}
            tone={status.tone === "neutral" ? "neutral" : status.tone}
          />
        </div>

        <Group
          title="Ugentlig indsatsgrænse"
          hint="Du får en advarsel, når din samlede indsats i en uge nærmer sig grænsen."
        >
          <Panel className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <QuickChip active={!limitOn} onClick={() => set("weeklyStakeLimit", 0)}>
                Ingen grænse
              </QuickChip>
              {LIMIT_PRESETS.map((n) => (
                <QuickChip
                  key={n}
                  active={form.weeklyStakeLimit === n}
                  onClick={() => set("weeklyStakeLimit", n)}
                >
                  {formatCurrency(n, form.currency)}
                </QuickChip>
              ))}
            </div>

            {limitOn && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="p-weeklimit-val" className="text-[12.5px] font-medium text-fg">
                    Eget beløb ({form.currency})
                  </label>
                  <Input
                    id="p-weeklimit-val"
                    type="number"
                    step="250"
                    min="0"
                    value={form.weeklyStakeLimit}
                    onChange={(e) => set("weeklyStakeLimit", Number(e.target.value))}
                    className="tabular w-36"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="text-subtle">Brugt af grænsen</span>
                    <span className="tabular font-medium text-muted">
                      {formatCurrency(stakedThisWeek, form.currency)} /{" "}
                      {formatCurrency(form.weeklyStakeLimit, form.currency)}
                    </span>
                  </div>
                  <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-500",
                        pct >= 1 ? "bg-negative" : pct >= 0.8 ? "bg-warning" : "bg-primary",
                      )}
                      style={{ width: `${Math.max(2, pct * 100)}%` }}
                    />
                    <span
                      aria-hidden
                      className="absolute inset-y-0 w-px bg-fg/30"
                      style={{ left: "80%" }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10.5px] text-subtle">Advarsel ved 80 %</p>
                </div>
              </>
            )}
          </Panel>
        </Group>

        <Group
          title="Sessionspåmindelse"
          hint="En blid påmindelse om hvor længe du har været i appen."
        >
          <Segmented<string>
            value={String(form.sessionReminderHours)}
            onChange={(v) => set("sessionReminderHours", Number(v))}
            options={[
              { value: "0", label: "Fra" },
              { value: "1", label: "Hver time" },
              { value: "2", label: "Hver 2. time" },
              { value: "3", label: "Hver 3. time" },
            ]}
          />
        </Group>

        <Group
          title="Brug for en pause eller hjælp?"
          hint="Uafhængige tjenester — ikke tilknyttet ValueBet AI."
        >
          <div className="grid gap-2.5 sm:grid-cols-3">
            {HELP_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="glow-hover group flex flex-col gap-1.5 rounded-card border border-line/70 bg-surface-2/40 p-3.5 transition-colors hover:border-line-strong"
              >
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
                  <HeartHandshake className="size-3.5 text-primary" aria-hidden />
                  {l.title}
                  <ExternalLink
                    className="ml-auto size-3 text-subtle transition-colors group-hover:text-fg"
                    aria-hidden
                  />
                </span>
                <span className="text-[11.5px] leading-snug text-subtle">{l.desc}</span>
              </a>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-subtle">
            Spil kun for penge du har råd til at tabe. 18+. ValueBet AI er et analyse- og
            trackingværktøj og formidler ikke spil.
          </p>
        </Group>
      </CardContent>
    </Card>
  );
}
