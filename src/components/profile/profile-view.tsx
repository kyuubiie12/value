"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Coins,
  Download,
  Info,
  Landmark,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  Type,
  UserRound,
} from "lucide-react";
import type {
  Bookmaker,
  League,
  PortfolioStats,
  UserSettings,
} from "@/types";
import { resetSettingsAction, updateSettingsAction } from "@/lib/actions";
import { applyAppearance, type AppearanceValues } from "@/lib/appearance";
import { AppearancePanel } from "./appearance-panel";
import { SectionHeader } from "./parts";
import type { FeedPulse } from "./types";
import { KontoSection } from "./sections/konto-section";
import { BankrollSection } from "./sections/bankroll-section";
import { FeedSection } from "./sections/feed-section";
import { BookmakereSection } from "./sections/bookmakere-section";
import { LigaerSection } from "./sections/ligaer-section";
import { NotifikationerSection } from "./sections/notifikationer-section";
import { AnsvarSection } from "./sections/ansvar-section";
import { DataSection } from "./sections/data-section";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatSignedCurrency,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/shared/sparkline";

const SECTIONS = [
  { id: "konto", label: "Konto", icon: UserRound },
  { id: "udseende", label: "Udseende", icon: Type },
  { id: "bankroll", label: "Bankroll & units", icon: Coins },
  { id: "feed", label: "Feed & value", icon: SlidersHorizontal },
  { id: "bookmakere", label: "Bookmakere", icon: Landmark },
  { id: "ligaer", label: "Favoritligaer", icon: Trophy },
  { id: "notifikationer", label: "Notifikationer", icon: Bell },
  { id: "ansvar", label: "Ansvarligt spil", icon: ShieldCheck },
  { id: "data", label: "Konto & data", icon: Download },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

export function ProfileView({
  settings,
  bookmakers,
  leagues,
  stats,
  bankrollHistory,
  stakedThisWeek,
  pulse,
  initialSection,
}: {
  settings: UserSettings;
  bookmakers: Bookmaker[];
  leagues: League[];
  stats: PortfolioStats;
  bankrollHistory: number[];
  stakedThisWeek: number;
  pulse: FeedPulse[];
  initialSection?: string;
}) {
  const router = useRouter();
  const [active, setActive] = React.useState<Section>(() =>
    SECTIONS.some((s) => s.id === initialSection)
      ? (initialSection as Section)
      : "konto",
  );
  const [form, setForm] = React.useState<UserSettings>(settings);
  const [pending, startTransition] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const [confirmReset, setConfirmReset] = React.useState(false);

  // Re-sync when the server sends new settings (e.g. after a reset).
  const [synced, setSynced] = React.useState(settings);
  if (synced !== settings) {
    setSynced(settings);
    setForm(settings);
    setConfirmReset(false);
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(settings);
  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const save = () =>
    startTransition(async () => {
      await updateSettingsAction(form);
      setSaved(true);
      router.refresh();
    });

  // Live-preview appearance changes across the whole app as they're picked.
  // Persistence (server + localStorage) happens on Gem via ThemeSync.
  const setAppearance = (patch: Partial<AppearanceValues>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
    applyAppearance(patch);
  };

  const discard = () => {
    setForm(settings);
    applyAppearance({
      theme: settings.theme,
      accent: settings.accent,
      displayFont: settings.displayFont,
      surface: settings.surface,
      corners: settings.corners,
      glow: settings.glow,
      animations: settings.animations,
    });
    setSaved(false);
  };

  const doReset = () =>
    startTransition(async () => {
      await resetSettingsAction();
      setConfirmReset(false);
      setSaved(false);
      router.refresh();
    });

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: form,
      snapshot: {
        bankroll: stats.bankroll,
        profit: stats.totalProfit,
        roi: stats.roi,
        hitRate: stats.hitRate,
        avgClv: stats.avgClv,
        bets: stats.betCount,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `valuebet-profil-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const growth =
    (stats.bankroll - stats.startingBankroll) / stats.startingBankroll;
  const initials =
    form.displayName
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "VB";
  const activeBooks = bookmakers.filter((b) =>
    form.activeBookmakerIds.includes(b.id),
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Identity + progress */}
      <div className="spot relative overflow-hidden [&::after]:inset-0 rounded-card-lg border border-line/60 bg-surface shadow-[var(--shadow-card)]">
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <span className="grid size-16 shrink-0 place-items-center rounded-[20px] bg-primary text-xl font-bold text-primary-contrast shadow-[var(--shadow-sm)]">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-lg font-semibold text-fg">
                {form.displayName}
              </p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  form.plan === "pro"
                    ? "bg-primary/15 text-primary-strong"
                    : "bg-surface-3 text-subtle",
                )}
              >
                {form.plan === "pro" ? "Pro" : "Free"}
              </span>
            </div>
            <p className="truncate text-xs text-subtle">{form.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-muted">
                Medlem siden {formatDate(form.memberSince)}
              </span>
              <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-muted">
                {stats.betCount} bets · {activeBooks.length} bookmakere
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-semibold",
                  stats.currentStreak.count === 0
                    ? "bg-surface-3 text-muted"
                    : stats.currentStreak.type === "win"
                      ? "bg-positive/12 text-positive"
                      : "bg-negative/12 text-negative",
                )}
              >
                {stats.currentStreak.count === 0
                  ? "Ingen stime"
                  : `${stats.currentStreak.count} i træk ${
                      stats.currentStreak.type === "win" ? "vundet" : "tabt"
                    }`}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-subtle">
              Bankroll
            </p>
            <p className="font-display text-2xl font-bold text-fg">
              {formatCurrency(stats.bankroll, stats.currency)}
            </p>
            <p
              className={cn(
                "text-[11px] font-semibold",
                growth >= 0 ? "text-positive" : "text-negative",
              )}
            >
              {formatSignedCurrency(stats.totalProfit, stats.currency)} ·{" "}
              {formatPercent(growth, { signed: true })}
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-2 border-t border-line sm:grid-cols-4">
          <ProgressStat
            label="ROI"
            value={formatPercent(stats.roi, { signed: true })}
            tone={stats.roi >= 0 ? "positive" : "negative"}
          />
          <ProgressStat label="Hit rate" value={formatPercent(stats.hitRate)} />
          <ProgressStat
            label="Gns. CLV"
            value={formatPercent(stats.avgClv, { signed: true })}
            tone={stats.avgClv >= 0 ? "positive" : "negative"}
          />
          <div className="flex flex-col justify-center gap-1 border-l border-line px-4 py-3">
            <span className="text-[10px] font-medium uppercase tracking-wide text-subtle">
              Udvikling
            </span>
            <Sparkline values={bankrollHistory} className="h-7 w-full" />
          </div>
        </div>
      </div>

      {/* Tabbed settings */}
      <div className="grid gap-4 md:grid-cols-[196px_1fr] md:items-start">
        <nav
          aria-label="Profilindstillinger"
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:pb-0"
        >
          {SECTIONS.map((s) => {
            const on = active === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-current={on ? "page" : undefined}
                onClick={() => setActive(s.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors md:w-full",
                  on
                    ? "bg-primary/12 text-primary-strong"
                    : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <s.icon className="size-4 shrink-0" strokeWidth={2} />
                <span className="whitespace-nowrap">{s.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {active === "konto" && <KontoSection form={form} set={set} />}

          {active === "udseende" && (
            <Card>
              <SectionHeader
                icon={Type}
                title="Udseende"
                desc="Tema, farver, hjørner, lys og skrifttype — ændringen vises med det samme"
              />
              <CardContent>
                <AppearancePanel
                  value={{
                    theme: form.theme,
                    accent: form.accent,
                    displayFont: form.displayFont,
                    surface: form.surface,
                    corners: form.corners,
                    glow: form.glow,
                    animations: form.animations,
                  }}
                  onChange={setAppearance}
                />
              </CardContent>
            </Card>
          )}

          {active === "bankroll" && (
            <BankrollSection form={form} set={set} stats={stats} pulse={pulse} />
          )}

          {active === "feed" && <FeedSection form={form} set={set} pulse={pulse} />}

          {active === "bookmakere" && (
            <BookmakereSection form={form} set={set} bookmakers={bookmakers} pulse={pulse} />
          )}

          {active === "ligaer" && (
            <LigaerSection form={form} set={set} leagues={leagues} pulse={pulse} />
          )}

          {active === "notifikationer" && (
            <NotifikationerSection form={form} set={set} pulse={pulse} />
          )}

          {active === "ansvar" && (
            <AnsvarSection form={form} set={set} stakedThisWeek={stakedThisWeek} />
          )}

          {active === "data" && (
            <DataSection
              email={form.email}
              pending={pending}
              confirmReset={confirmReset}
              setConfirmReset={setConfirmReset}
              onExport={exportData}
              onReset={doReset}
            />
          )}
        </div>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-full border border-line-strong/70 bg-bg-elevated py-2.5 pl-5 pr-2.5 shadow-[var(--shadow-pop)]">
        <span className="flex items-center gap-1.5 text-xs text-subtle">
          <Info className="size-3.5" />
          {dirty ? "Du har ugemte ændringer" : "Alt er gemt"}
        </span>
        <div className="flex items-center gap-2">
          {dirty && (
            <Button variant="ghost" onClick={discard} disabled={pending}>
              Fortryd
            </Button>
          )}
          <Button onClick={save} loading={pending} disabled={!dirty}>
            {saved && !dirty ? (
              <>
                <Check className="size-4" /> Gemt
              </>
            ) : (
              "Gem ændringer"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}


function ProgressStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="border-l border-line px-4 py-3 first:border-l-0 sm:first:border-l">
      <p className="text-[10px] font-medium uppercase tracking-wide text-subtle">
        {label}
      </p>
      <p
        className={cn(
          "tabular mt-1 text-[15px] font-semibold",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          tone === "neutral" && "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}
