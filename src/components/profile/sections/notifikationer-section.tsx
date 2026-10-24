"use client";

import * as React from "react";
import { Bell, CalendarRange, CircleAlert, TrendingUp, Zap } from "lucide-react";
import type { UserSettings } from "@/types";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Metric, SectionHeader, SliderField } from "../parts";
import type { FeedPulse, SetSetting } from "../types";

type Key = "valueAlerts" | "priceMoveAlerts" | "betResultAlerts" | "weeklyReport";

const CATEGORIES: {
  key: Key;
  icon: React.ElementType;
  tone: string;
  title: string;
  desc: string;
  example: { title: string; body: string; when: string };
}[] = [
  {
    key: "valueAlerts",
    icon: Zap,
    tone: "text-primary",
    title: "Nye value bets",
    desc: "Når AI'en finder et value bet i dine ligaer og hos dine bookmakere",
    example: {
      title: "Nyt value bet · +10,5% EV",
      body: "Real Madrid – Liverpool: Over 3.5 mål hos Betano til 2,90.",
      when: "2 min siden",
    },
  },
  {
    key: "priceMoveAlerts",
    icon: CircleAlert,
    tone: "text-warning",
    title: "Odds-bevægelser",
    desc: "Når prisen på et spil du har set flytter sig markant",
    example: {
      title: "Odds falder på dit spil",
      body: "Arsenal-sejr er gået fra 2,15 til 2,05 — markedet bekræfter.",
      when: "14 min siden",
    },
  },
  {
    key: "betResultAlerts",
    icon: TrendingUp,
    tone: "text-positive",
    title: "Bet-resultater",
    desc: "Når et af dine åbne bets bliver afgjort — vundet eller tabt",
    example: {
      title: "Vundet · +212 kr.",
      body: "Arsenal – Manchester City: Begge hold scorer. Odds 2,06.",
      when: "1 t siden",
    },
  },
  {
    key: "weeklyReport",
    icon: CalendarRange,
    tone: "text-info",
    title: "Ugentlig rapport",
    desc: "Opsummering af P&L, ROI og CLV hver mandag",
    example: {
      title: "Din uge: +4,2% ROI",
      body: "7 afgjorte bets, CLV +2,8%. Se hele rapporten.",
      when: "Mandag 08.00",
    },
  },
];

export function NotifikationerSection({
  form,
  set,
  pulse,
}: {
  form: UserSettings;
  set: SetSetting;
  pulse: FeedPulse[];
}) {
  const on = CATEGORIES.filter((c) => form[c.key]).length;
  const wouldNotify = pulse.filter((p) => p.ev >= form.alertMinEdge).length;

  return (
    <Card>
      <SectionHeader
        icon={Bell}
        title="Notifikationer"
        desc="Vælg præcis hvad du vil høre om — resten dukker ikke op i klokken"
      />
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric
            label="Aktive kategorier"
            value={
              <>
                {on}
                <span className="text-[13px] font-medium text-subtle"> / {CATEGORIES.length}</span>
              </>
            }
            tone={on === 0 ? "warning" : "primary"}
            sub={on === 0 ? "Klokken er tavs" : "Vises i klokken øverst"}
          />
          <Metric
            label="Value-alerts i dag"
            value={form.valueAlerts ? wouldNotify : "—"}
            sub={
              form.valueAlerts
                ? `af ${pulse.length} value bets er over din grænse`
                : "Slået fra"
            }
          />
        </div>

        <div className="flex flex-col gap-3">
          {CATEGORIES.map((c) => {
            const checked = form[c.key];
            return (
              <div
                key={c.key}
                className={cn(
                  "rounded-card border p-4 transition-colors",
                  checked ? "border-line/70 bg-surface-2/40" : "border-line/50 bg-transparent",
                )}
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={cn(
                      "mt-0.5 grid size-9 shrink-0 place-items-center rounded-[12px] ring-1 ring-inset ring-line/70",
                      checked ? "bg-surface-3" : "bg-surface-2/60 opacity-60",
                    )}
                  >
                    <c.icon className={cn("size-4", c.tone)} strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Switch
                      id={`n-${c.key}`}
                      checked={checked}
                      onChange={(v) => set(c.key, v)}
                      label={c.title}
                      description={c.desc}
                    />
                  </div>
                </div>

                {c.key === "valueAlerts" && checked && (
                  <div className="mt-4 border-t border-line/50 pt-4 sm:pl-[50px]">
                    <SliderField
                      id="p-alert-edge"
                      label="Kun value bets over"
                      value={form.alertMinEdge}
                      min={0}
                      max={0.1}
                      step={0.005}
                      onChange={(v) => set("alertMinEdge", Number(v.toFixed(3)))}
                      format={(v) => `${formatPercent(v, { digits: 1 })} EV`}
                      hint="Value bets under grænsen giver ingen besked."
                    />
                  </div>
                )}

                {checked && (
                  <div className="mt-4 sm:pl-[50px]">
                    <p className="mb-1.5 text-[10.5px] font-medium text-subtle">Sådan ser den ud</p>
                    <div className="flex gap-3 rounded-[var(--radius-sm)] border border-line/60 bg-bg/50 px-3.5 py-2.5">
                      <c.icon className={cn("mt-0.5 size-4 shrink-0", c.tone)} aria-hidden />
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-medium leading-snug text-fg">
                          {c.example.title}
                        </p>
                        <p className="mt-0.5 text-[11.5px] leading-snug text-muted">
                          {c.example.body}
                        </p>
                        <p className="mt-1 text-[10px] text-subtle">{c.example.when}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
