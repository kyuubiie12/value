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
  Monitor,
  Moon,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trophy,
  Type,
  UserRound,
  X,
} from "lucide-react";
import type {
  AccentColor,
  Bookmaker,
  DisplayFont,
  League,
  PortfolioStats,
  ThemeMode,
  UnitMode,
  UserSettings,
} from "@/types";
import { resetSettingsAction, updateSettingsAction } from "@/lib/actions";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Segmented } from "@/components/ui/segmented";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { Switch } from "@/components/ui/switch";
import { BookmakerLogo } from "@/components/shared/bookmaker-logo";
import { LeagueBadge } from "@/components/shared/league-badge";
import { Sparkline } from "@/components/shared/sparkline";
import { LogoutButton } from "@/components/auth/logout-button";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DeleteAccountRow } from "@/components/auth/delete-account-row";

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

const FONT_OPTIONS: {
  value: DisplayFont;
  label: string;
  desc: string;
  family: string;
  upper?: boolean;
}[] = [
  {
    value: "grotesk",
    label: "Moderne",
    desc: "Space Grotesk — ren og afbalanceret",
    family: "var(--font-grotesk)",
  },
  {
    value: "oswald",
    label: "Stadion",
    desc: "Oswald — smal, klassisk sports-look",
    family: "var(--font-oswald)",
    upper: true,
  },
  {
    value: "teko",
    label: "Måltavle",
    desc: "Teko — kompakt, som en scoreboard",
    family: "var(--font-teko)",
    upper: true,
  },
  {
    value: "rajdhani",
    label: "Turbo",
    desc: "Rajdhani — teknisk og kantet",
    family: "var(--font-rajdhani)",
    upper: true,
  },
  {
    value: "anton",
    label: "Mesterskab",
    desc: "Anton — massiv og højlydt",
    family: "var(--font-anton)",
    upper: true,
  },
];

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "dark", label: "Mørk" },
  { value: "light", label: "Lys" },
  { value: "system", label: "System" },
];

const ACCENT_OPTIONS: { value: AccentColor; label: string; dot: string }[] = [
  { value: "emerald", label: "Smaragd", dot: "#1fce90" },
  { value: "blue", label: "Blå", dot: "#4098f5" },
  { value: "violet", label: "Violet", dot: "#9a7bf0" },
  { value: "amber", label: "Rav", dot: "#eaa93c" },
];

type Section = (typeof SECTIONS)[number]["id"];

const root = () =>
  typeof document !== "undefined" ? document.documentElement : null;

export function ProfileView({
  settings,
  bookmakers,
  leagues,
  stats,
  bankrollHistory,
  stakedThisWeek,
  initialSection,
}: {
  settings: UserSettings;
  bookmakers: Bookmaker[];
  leagues: League[];
  stats: PortfolioStats;
  bankrollHistory: number[];
  stakedThisWeek: number;
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
  const toggleIn = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const save = () =>
    startTransition(async () => {
      await updateSettingsAction(form);
      setSaved(true);
      router.refresh();
    });

  // Live-preview appearance changes across the whole app as they're picked.
  // Persistence (server + localStorage) happens on Gem via ThemeSync.
  const pickFont = (value: DisplayFont) => {
    set("displayFont", value);
    root()?.setAttribute("data-display-font", value);
  };
  const pickTheme = (value: ThemeMode) => {
    set("theme", value);
    const resolved =
      value === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : value;
    root()?.setAttribute("data-theme", resolved);
  };
  const pickAccent = (value: AccentColor) => {
    set("accent", value);
    root()?.setAttribute("data-accent", value);
  };

  const discard = () => {
    setForm(settings);
    const el = root();
    el?.setAttribute("data-display-font", settings.displayFont);
    el?.setAttribute(
      "data-theme",
      settings.theme === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : settings.theme,
    );
    el?.setAttribute("data-accent", settings.accent);
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

  const weekLimitOn = form.weeklyStakeLimit > 0;
  const weekPct = weekLimitOn
    ? Math.min(1, stakedThisWeek / form.weeklyStakeLimit)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Identity + progress */}
      <div className="relative overflow-hidden rounded-card-lg border border-line bg-surface">
        <div className="pointer-events-none absolute -left-16 -top-24 size-64 rounded-full bg-primary/12 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-info/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-strong text-xl font-bold text-primary-contrast shadow-[0_10px_30px_-10px_rgba(31,206,144,0.6)]">
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
              <span className="rounded-[var(--radius-sm)] bg-surface-3 px-2 py-0.5 text-muted">
                Medlem siden {formatDate(form.memberSince)}
              </span>
              <span className="rounded-[var(--radius-sm)] bg-surface-3 px-2 py-0.5 text-muted">
                {stats.betCount} bets · {activeBooks.length} bookmakere
              </span>
              <span
                className={cn(
                  "rounded-[var(--radius-sm)] px-2 py-0.5 font-semibold",
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
                  "flex shrink-0 items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-[13px] font-medium transition-colors md:w-full",
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
          {active === "konto" && (
            <Card>
              <SectionHeader
                icon={UserRound}
                title="Konto"
                desc="Navn, e-mail og lokale indstillinger"
              />
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Visningsnavn" htmlFor="p-name">
                  <Input
                    id="p-name"
                    value={form.displayName}
                    onChange={(e) => set("displayName", e.target.value)}
                  />
                </Field>
                <Field
                  label="E-mail"
                  htmlFor="p-email"
                  hint="Din login-e-mail kan ikke ændres her."
                >
                  <Input id="p-email" type="email" value={form.email} disabled />
                </Field>
                <Field label="Valuta" htmlFor="p-currency">
                  <Select
                    id="p-currency"
                    value={form.currency}
                    onChange={(e) =>
                      set("currency", e.target.value as UserSettings["currency"])
                    }
                    options={[
                      { value: "DKK", label: "DKK — Danske kroner" },
                      { value: "EUR", label: "EUR — Euro" },
                      { value: "USD", label: "USD — US dollar" },
                    ]}
                  />
                </Field>
                <Field label="Tidszone" htmlFor="p-tz">
                  <Select
                    id="p-tz"
                    value={form.timezone}
                    onChange={(e) => set("timezone", e.target.value)}
                    options={[
                      { value: "Europe/Copenhagen", label: "Europe/Copenhagen" },
                      { value: "Europe/London", label: "Europe/London" },
                      { value: "Europe/Stockholm", label: "Europe/Stockholm" },
                      { value: "UTC", label: "UTC" },
                    ]}
                  />
                </Field>
              </CardContent>
            </Card>
          )}

          {active === "udseende" && (
            <Card>
              <SectionHeader
                icon={Type}
                title="Udseende"
                desc="Tema, accentfarve og skrifttype — ændringen vises med det samme"
              />
              <CardContent className="flex flex-col gap-6">
                <div>
                  <PickerLabel>Tema</PickerLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {THEME_OPTIONS.map((t) => {
                      const on = form.theme === t.value;
                      const Icon =
                        t.value === "dark"
                          ? Moon
                          : t.value === "light"
                            ? Sun
                            : Monitor;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => pickTheme(t.value)}
                          aria-pressed={on}
                          className={cn(
                            "flex flex-col items-center gap-2 rounded-[var(--radius-sm)] border px-2 py-3 text-center transition-colors",
                            on
                              ? "border-primary/45 bg-primary/[0.07]"
                              : "border-line bg-surface-2/40 hover:border-line-strong",
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "grid size-9 shrink-0 place-items-center rounded-[8px] ring-1 ring-inset ring-line-strong",
                              t.value === "dark"
                                ? "bg-[#0e131d] text-[#4ee7b0]"
                                : t.value === "light"
                                  ? "bg-white text-[#0e9c6c]"
                                  : "bg-gradient-to-br from-[#0e131d] to-white text-fg",
                            )}
                          >
                            <Icon className="size-4" strokeWidth={2} />
                          </span>
                          <span className="flex items-center gap-1 text-[12px] font-medium text-fg">
                            {t.label}
                            {on && (
                              <Check
                                className="size-3.5 text-primary-strong"
                                strokeWidth={3}
                              />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <PickerLabel>Accentfarve</PickerLabel>
                  <div className="flex flex-wrap gap-2.5">
                    {ACCENT_OPTIONS.map((a) => {
                      const on = form.accent === a.value;
                      return (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => pickAccent(a.value)}
                          aria-pressed={on}
                          aria-label={a.label}
                          className={cn(
                            "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-[12px] font-medium transition-colors",
                            on
                              ? "border-primary/50 bg-primary/[0.08] text-fg"
                              : "border-line bg-surface-2/40 text-muted hover:border-line-strong hover:text-fg",
                          )}
                        >
                          <span
                            aria-hidden
                            className="grid size-6 place-items-center rounded-full ring-1 ring-inset ring-black/10"
                            style={{ backgroundColor: a.dot }}
                          >
                            {on && (
                              <Check
                                className="size-3.5 text-white"
                                strokeWidth={3}
                              />
                            )}
                          </span>
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <PickerLabel>Skrifttype</PickerLabel>
                  <div className="flex flex-col gap-2.5">
                    {FONT_OPTIONS.map((f) => {
                  const on = form.displayFont === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => pickFont(f.value)}
                      className={cn(
                        "flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border px-4 py-3 text-left transition-colors",
                        on
                          ? "border-primary/40 bg-primary/[0.06]"
                          : "border-line bg-surface-2/40 hover:border-line-strong",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-[13px] font-medium text-fg">
                          {f.label}
                          {on && (
                            <Check
                              className="size-3.5 text-primary-strong"
                              strokeWidth={3}
                            />
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-subtle">
                          {f.desc}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          "shrink-0 leading-none text-fg",
                          f.upper ? "text-[26px]" : "text-[22px]",
                        )}
                        style={{
                          fontFamily: f.family,
                          letterSpacing: f.upper ? "0.01em" : "-0.02em",
                          textTransform: f.upper ? "uppercase" : "none",
                          fontWeight: f.value === "anton" ? 400 : 600,
                        }}
                      >
                        Superliga
                      </span>
                    </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-subtle">
                  Vises overalt med det samme — husk at trykke Gem for at beholde
                  det.
                </p>
              </CardContent>
            </Card>
          )}

          {active === "bankroll" && (
            <Card>
              <SectionHeader
                icon={Coins}
                title="Bankroll & units"
                desc="Din kapital og hvad én unit svarer til — bruges til Kelly-anbefalinger"
              />
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={`Startkapital (${form.currency})`}
                    htmlFor="p-bankroll"
                  >
                    <Input
                      id="p-bankroll"
                      type="number"
                      step="500"
                      value={form.startingBankroll}
                      onChange={(e) =>
                        set("startingBankroll", Number(e.target.value))
                      }
                      className="tabular"
                    />
                  </Field>
                  <Field
                    label="Standard-indsats"
                    htmlFor="p-units"
                    hint="Units pr. spil, forudfyldes i bet-formularen"
                  >
                    <Input
                      id="p-units"
                      type="number"
                      step="0.25"
                      min="0"
                      value={form.defaultStakeUnits}
                      onChange={(e) =>
                        set("defaultStakeUnits", Number(e.target.value))
                      }
                      className="tabular"
                    />
                  </Field>
                </div>

                <div>
                  <span className="mb-2 block text-[11px] font-medium text-muted">
                    Unit-model
                  </span>
                  <Segmented<UnitMode>
                    value={form.unitMode}
                    onChange={(v) => set("unitMode", v)}
                    options={[
                      { value: "fixed", label: "Fast beløb" },
                      { value: "percentage", label: "% af bankroll" },
                    ]}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={
                      form.unitMode === "fixed"
                        ? `1 unit i ${form.currency}`
                        : "1 unit i %"
                    }
                    htmlFor="p-unit-size"
                    hint={
                      form.unitMode === "fixed"
                        ? `1 unit = ${formatCurrency(form.unitSize, form.currency)}`
                        : `1 unit = ${form.unitSize}% af bankroll`
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
                    label="Kelly-fraktion"
                    htmlFor="p-kelly"
                    hint="Multiplikator på Kelly-anbefalinger"
                  >
                    <Select
                      id="p-kelly"
                      value={String(form.kellyFraction)}
                      onChange={(e) =>
                        set("kellyFraction", Number(e.target.value))
                      }
                      options={[
                        { value: "1", label: "Fuld Kelly" },
                        { value: "0.5", label: "½ Kelly" },
                        { value: "0.25", label: "¼ Kelly (anbefalet)" },
                        { value: "0.1", label: "⅒ Kelly" },
                      ]}
                    />
                  </Field>
                </div>

                <Field
                  label="Afrund anbefalet indsats til nærmeste"
                  htmlFor="p-round"
                  hint="Gør de foreslåede indsatser til pæne tal"
                >
                  <Select
                    id="p-round"
                    value={String(form.stakeRounding)}
                    onChange={(e) =>
                      set("stakeRounding", Number(e.target.value))
                    }
                    options={[
                      { value: "1", label: `1 ${form.currency}` },
                      { value: "5", label: `5 ${form.currency}` },
                      { value: "10", label: `10 ${form.currency}` },
                      { value: "25", label: `25 ${form.currency}` },
                    ]}
                  />
                </Field>
              </CardContent>
            </Card>
          )}

          {active === "feed" && (
            <Card>
              <SectionHeader
                icon={SlidersHorizontal}
                title="Feed & value"
                desc="Styr hvad der overhovedet vises i dit value-feed"
              />
              <CardContent className="flex flex-col gap-4">
                <Field
                  label="Skjul value bets under denne EV"
                  htmlFor="p-minedge"
                  hint="Spil med lavere forventet værdi kommer slet ikke frem i feedet"
                >
                  <div className="relative sm:w-44">
                    <Input
                      id="p-minedge"
                      type="number"
                      step="0.5"
                      min="0"
                      value={(form.minEdge * 100).toFixed(1)}
                      onChange={(e) =>
                        set("minEdge", Number(e.target.value) / 100)
                      }
                      className="tabular pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-subtle">
                      %
                    </span>
                  </div>
                </Field>
                <p className="rounded-[var(--radius-sm)] bg-surface-2/50 px-3 py-2 text-[11px] leading-relaxed text-subtle">
                  Feedet regner kun value på de bookmakere du har valgt, og
                  sorterer dine favoritligaer øverst.
                </p>

                <div className="flex flex-col gap-4 border-t border-line pt-4">
                  <Switch
                    id="p-autofollow"
                    checked={form.autoFollow}
                    onChange={(v) => set("autoFollow", v)}
                    label="Følg AI'ens picks automatisk"
                    description="Hvert nyt value bet over grænsen lægges i din portefølje som åbent spil med den anbefalede Kelly-indsats. Du afgør dem selv bagefter."
                  />
                  {form.autoFollow && (
                    <div className="flex flex-col gap-3 pl-1">
                      <Field
                        label="Følg kun bets over"
                        htmlFor="p-autofollow-edge"
                        hint="Højere grænse = færre, men skarpere spil"
                      >
                        <div className="relative sm:w-44">
                          <Input
                            id="p-autofollow-edge"
                            type="number"
                            step="0.5"
                            min="0"
                            value={(form.autoFollowMinEdge * 100).toFixed(1)}
                            onChange={(e) =>
                              set(
                                "autoFollowMinEdge",
                                Number(e.target.value) / 100,
                              )
                            }
                            className="tabular pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-subtle">
                            %
                          </span>
                        </div>
                      </Field>
                      <ul className="flex flex-col gap-1 text-[11px] leading-relaxed text-subtle">
                        <li>• Kun bets hos dine valgte bookmakere følges.</li>
                        <li>
                          • Fjerner du et auto-spil, følger AI&apos;en det ikke
                          igen.
                        </li>
                        <li>
                          • Har du sat en ugentlig indsatsgrænse, stopper
                          auto-følg når den er nået.
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {active === "bookmakere" && (
            <Card>
              <SectionHeader
                icon={Landmark}
                title="Mine bookmakere"
                desc="Vælg hvor du har konti — feedet regner kun value på de odds du kan spille"
              />
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {bookmakers.map((b) => {
                  const on = form.activeBookmakerIds.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        set(
                          "activeBookmakerIds",
                          toggleIn(form.activeBookmakerIds, b.id),
                        )
                      }
                      className={cn(
                        "flex items-center gap-3 rounded-[var(--radius-sm)] border px-3 py-2.5 text-left transition-colors",
                        on
                          ? "border-primary/35 bg-primary/[0.06]"
                          : "border-line bg-surface-2/40 hover:border-line-strong",
                      )}
                    >
                      <BookmakerLogo bookmakerId={b.id} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-fg">
                          {b.name}
                        </span>
                        <span className="text-[11px] text-subtle">
                          {b.isSharp ? "Sharp bog" : b.country}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "grid size-4 shrink-0 place-items-center rounded-full border transition-colors",
                          on
                            ? "border-primary bg-primary text-primary-contrast"
                            : "border-line-strong",
                        )}
                      >
                        {on && <Check className="size-3" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {active === "ligaer" && (
            <Card>
              <SectionHeader
                icon={Trophy}
                title="Favoritligaer"
                desc="Vises øverst i feedet og i dine alerts"
              />
              <CardContent className="flex flex-wrap gap-1.5">
                {leagues.map((l) => (
                  <ToggleChip
                    key={l.id}
                    active={form.favoriteLeagueIds.includes(l.id)}
                    onClick={() =>
                      set(
                        "favoriteLeagueIds",
                        toggleIn(form.favoriteLeagueIds, l.id),
                      )
                    }
                  >
                    {l.name}
                  </ToggleChip>
                ))}
                {form.favoriteLeagueIds.length > 0 && (
                  <p className="mt-2 flex w-full flex-wrap items-center gap-1.5 text-[11px] text-subtle">
                    Rækkefølge i feedet:
                    {form.favoriteLeagueIds.map((id) => (
                      <LeagueBadge
                        key={id}
                        leagueId={id}
                        className="text-[11px]"
                      />
                    ))}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {active === "notifikationer" && (
            <Card>
              <SectionHeader
                icon={Bell}
                title="Notifikationer"
                desc="Tik af hvad du vil have besked om — resten vises ikke i klokken"
              />
              <CardContent className="flex flex-col gap-5">
                <Switch
                  id="p-alerts"
                  checked={form.valueAlerts}
                  onChange={(v) => set("valueAlerts", v)}
                  label="Nye value bets"
                  description="Når AI'en finder et value bet i dine ligaer og hos dine bookmakere"
                />
                {form.valueAlerts && (
                  <Field
                    label="Kun value bets over"
                    htmlFor="p-alert-edge"
                    hint="Value bets under denne EV giver ingen besked"
                    className="pl-1"
                  >
                    <div className="relative sm:w-44">
                      <Input
                        id="p-alert-edge"
                        type="number"
                        step="0.5"
                        min="0"
                        value={(form.alertMinEdge * 100).toFixed(1)}
                        onChange={(e) =>
                          set("alertMinEdge", Number(e.target.value) / 100)
                        }
                        className="tabular pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-subtle">
                        %
                      </span>
                    </div>
                  </Field>
                )}

                <div className="flex flex-col gap-5 border-t border-line pt-5">
                  <Switch
                    id="p-pricemove"
                    checked={form.priceMoveAlerts}
                    onChange={(v) => set("priceMoveAlerts", v)}
                    label="Odds-bevægelser"
                    description="Når oddsene på et spil du har set flytter sig markant"
                  />
                  <Switch
                    id="p-results"
                    checked={form.betResultAlerts}
                    onChange={(v) => set("betResultAlerts", v)}
                    label="Bet-resultater"
                    description="Når et af dine åbne bets bliver afgjort (vundet eller tabt)"
                  />
                  <Switch
                    id="p-weekly"
                    checked={form.weeklyReport}
                    onChange={(v) => set("weeklyReport", v)}
                    label="Ugentlig rapport"
                    description="Opsummering af P&L, ROI og CLV hver mandag"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {active === "ansvar" && (
            <Card>
              <SectionHeader
                icon={ShieldCheck}
                title="Ansvarligt spil"
                desc="Sæt dine egne grænser — ValueBet AI placerer aldrig væddemål for dig"
              />
              <CardContent className="flex flex-col gap-5">
                <Switch
                  id="p-weeklimit"
                  checked={weekLimitOn}
                  onChange={(v) => set("weeklyStakeLimit", v ? 2000 : 0)}
                  label="Ugentlig indsatsgrænse"
                  description="Få en advarsel når din samlede indsats i en uge nærmer sig grænsen"
                />
                {weekLimitOn && (
                  <div className="flex flex-col gap-2 pl-1">
                    <Field
                      label={`Grænse (${form.currency})`}
                      htmlFor="p-weeklimit-val"
                    >
                      <Input
                        id="p-weeklimit-val"
                        type="number"
                        step="250"
                        min="0"
                        value={form.weeklyStakeLimit}
                        onChange={(e) =>
                          set("weeklyStakeLimit", Number(e.target.value))
                        }
                        className="tabular sm:w-44"
                      />
                    </Field>
                    <div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-subtle">Spillet denne uge</span>
                        <span className="tabular font-medium text-muted">
                          {formatCurrency(stakedThisWeek, form.currency)} /{" "}
                          {formatCurrency(form.weeklyStakeLimit, form.currency)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            weekPct >= 1
                              ? "bg-negative"
                              : weekPct >= 0.8
                                ? "bg-warning"
                                : "bg-primary",
                          )}
                          style={{ width: `${Math.max(2, weekPct * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-line pt-5">
                  <Field
                    label="Sessionspåmindelse"
                    htmlFor="p-session"
                    hint="Mind mig om hvor længe jeg har været i appen"
                  >
                    <Select
                      id="p-session"
                      value={String(form.sessionReminderHours)}
                      onChange={(e) =>
                        set("sessionReminderHours", Number(e.target.value))
                      }
                      options={[
                        { value: "0", label: "Fra" },
                        { value: "1", label: "Hver time" },
                        { value: "2", label: "Hver 2. time" },
                        { value: "3", label: "Hver 3. time" },
                      ]}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>
          )}

          {active === "data" && (
            <Card>
              <SectionHeader
                icon={Download}
                title="Konto & data"
                desc="Din data er din — tag den med, eller start forfra"
              />
              <CardContent className="flex flex-col gap-3">
                <DataRow
                  title="Eksportér mine data"
                  desc="Hent profil og nøgletal som en JSON-fil"
                  action={
                    <Button variant="outline" size="sm" onClick={exportData}>
                      <Download className="size-3.5" />
                      Eksportér
                    </Button>
                  }
                />
                <ChangePasswordForm />
                <DataRow
                  title="Log ud"
                  desc="Afslut din session på denne enhed"
                  action={<LogoutButton />}
                />
                <DataRow
                  title="Nulstil indstillinger"
                  desc="Alt undtagen navn og e-mail sættes tilbage til standard"
                  action={
                    confirmReset ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={doReset}
                          loading={pending}
                        >
                          Ja, nulstil
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmReset(false)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmReset(true)}
                      >
                        <RotateCcw className="size-3.5" />
                        Nulstil
                      </Button>
                    )
                  }
                />
                <DeleteAccountRow email={form.email} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-card border border-line-strong bg-bg-elevated px-4 py-3 shadow-lg">
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

function PickerLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">
      {children}
    </span>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <CardHeader className="flex-row items-start gap-3">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-2 text-muted ring-1 ring-inset ring-line">
        <Icon className="size-3.5" strokeWidth={2} />
      </span>
      <span className="flex flex-col gap-1">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </span>
    </CardHeader>
  );
}

function DataRow({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-line bg-surface-2/40 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-fg">{title}</p>
        <p className="text-[11px] text-subtle">{desc}</p>
      </div>
      <div className="shrink-0">{action}</div>
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
