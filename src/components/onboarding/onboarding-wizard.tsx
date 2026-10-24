"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { Bookmaker, Currency, League } from "@/types";
import { applyAppearance, type AppearanceValues } from "@/lib/appearance";
import { AppearancePanel } from "@/components/profile/appearance-panel";
import { completeOnboardingAction } from "@/lib/actions";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { Switch } from "@/components/ui/switch";
import { BookmakerLogo } from "@/components/shared/bookmaker-logo";
import { BrandMark } from "@/components/shared/brand-mark";

type Risk = "cautious" | "balanced" | "aggressive";

const BANKROLL_PRESETS = [5_000, 10_000, 25_000, 50_000];

const RISK_OPTIONS: { value: Risk; label: string; desc: string }[] = [
  {
    value: "cautious",
    label: "Forsigtig",
    desc: "Mindre indsatser, roligere udsving. ⅒ Kelly.",
  },
  {
    value: "balanced",
    label: "Balanceret",
    desc: "Den anbefalede middelvej. ¼ Kelly.",
  },
  {
    value: "aggressive",
    label: "Aggressiv",
    desc: "Større indsatser, større udsving. ½ Kelly.",
  },
];

const NOTIF_OPTIONS: {
  key: "valueAlerts" | "priceMoveAlerts" | "betResultAlerts" | "weeklyReport";
  label: string;
  desc: string;
}[] = [
  {
    key: "valueAlerts",
    label: "Nye value bets",
    desc: "Når AI'en finder et spil over din grænse",
  },
  {
    key: "priceMoveAlerts",
    label: "Odds-bevægelser",
    desc: "Når prisen på et af dine spil flytter sig",
  },
  {
    key: "betResultAlerts",
    label: "Resultater",
    desc: "Når et af dine spil bliver afgjort",
  },
  {
    key: "weeklyReport",
    label: "Ugentlig opsummering",
    desc: "Kort overblik hver mandag med ugens tal",
  },
];

const STEPS = [
  "Bankroll",
  "Bookmakere",
  "Ligaer",
  "Risiko",
  "Auto-follow",
  "Notifikationer",
  "Udseende",
] as const;

export function OnboardingWizard({
  firstName,
  bookmakers,
  leagues,
  defaults,
}: {
  firstName: string;
  bookmakers: Bookmaker[];
  leagues: League[];
  defaults: {
    bankroll: number;
    currency: Currency;
    autoFollowMinEdge: number;
    appearance: AppearanceValues;
  };
}) {
  const [step, setStep] = React.useState(0);
  const [pending, startTransition] = React.useTransition();

  const [bankroll, setBankroll] = React.useState(defaults.bankroll);
  const [currency, setCurrency] = React.useState<Currency>(defaults.currency);
  const [bookmakerIds, setBookmakerIds] = React.useState<string[]>([]);
  const [leagueIds, setLeagueIds] = React.useState<string[]>([]);
  const [risk, setRisk] = React.useState<Risk>("balanced");
  const [autoFollow, setAutoFollow] = React.useState(false);
  const [autoFollowPct, setAutoFollowPct] = React.useState(
    Number((defaults.autoFollowMinEdge * 100).toFixed(1)),
  );
  const [notif, setNotif] = React.useState({
    valueAlerts: true,
    priceMoveAlerts: true,
    betResultAlerts: true,
    weeklyReport: true,
  });
  const [appearance, setAppearanceState] = React.useState<AppearanceValues>(
    defaults.appearance,
  );

  const toggle = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  // Previews live across the whole page as options are picked.
  const setAppearance = (patch: Partial<AppearanceValues>) => {
    setAppearanceState((a) => ({ ...a, ...patch }));
    applyAppearance(patch);
  };

  const canNext =
    (step === 0 && bankroll >= 100) ||
    (step === 1 && bookmakerIds.length > 0) ||
    step > 1;

  const last = step === STEPS.length - 1;

  const finish = () => {
    // Persist appearance to localStorage so the boot script picks it up on the
    // very next page load, before ThemeSync mounts — no flash.
    applyAppearance(appearance, { persist: true });
    startTransition(() => {
      void completeOnboardingAction({
        bankroll,
        currency,
        bookmakerIds,
        leagueIds,
        risk,
        autoFollow,
        autoFollowMinEdge: autoFollowPct / 100,
        notifications: notif,
        ...appearance,
      });
    });
  };

  const next = () => {
    if (!canNext) return;
    if (last) finish();
    else setStep((s) => s + 1);
  };

  return (
    <div className="flex flex-col">
      <BrandMark size="sm" className="mb-6" />

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-subtle">
          <span>
            Trin {step + 1} af {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-line bg-bg-elevated p-5 shadow-[var(--shadow-pop)] sm:p-6">
        {step === 0 && (
          <Step
            title={firstName ? `Velkommen, ${firstName}` : "Velkommen"}
            subtitle="Hvad starter din bankroll på? Det er beløbet, vi regner Kelly-indsatser ud fra — du kan altid ændre det senere."
          >
            <div className="flex flex-wrap gap-1.5">
              {BANKROLL_PRESETS.map((v) => (
                <ToggleChip
                  key={v}
                  active={bankroll === v}
                  onClick={() => setBankroll(v)}
                >
                  {formatCurrency(v, currency)}
                </ToggleChip>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-muted">
                  Beløb
                </span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={100}
                  step={500}
                  value={bankroll || ""}
                  onChange={(e) => setBankroll(Number(e.target.value))}
                  className="tabular"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-muted">
                  Valuta
                </span>
                <Segmented<Currency>
                  value={currency}
                  onChange={setCurrency}
                  options={[
                    { value: "DKK", label: "DKK" },
                    { value: "EUR", label: "EUR" },
                    { value: "USD", label: "USD" },
                  ]}
                />
              </label>
            </div>
          </Step>
        )}

        {step === 1 && (
          <Step
            title="Hvor har du spillekonti?"
            subtitle="Feedet regner kun value på de odds du faktisk kan spille. Vælg mindst én — tilføj gerne flere senere."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {bookmakers.map((b) => {
                const on = bookmakerIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() =>
                      setBookmakerIds((ids) => toggle(ids, b.id))
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
                    <Tick on={on} />
                  </button>
                );
              })}
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step
            title="Hvilke ligaer følger du mest?"
            subtitle="Dem sætter vi øverst i dit feed. Spring bare over hvis du vil se alt — du kan ændre det når som helst."
          >
            <div className="flex flex-wrap gap-1.5">
              {leagues.map((l) => (
                <ToggleChip
                  key={l.id}
                  active={leagueIds.includes(l.id)}
                  onClick={() => setLeagueIds((ids) => toggle(ids, l.id))}
                >
                  {l.name}
                </ToggleChip>
              ))}
            </div>
            {leagueIds.length > 0 && (
              <p className="text-[11px] text-subtle">
                {leagueIds.length} liga{leagueIds.length === 1 ? "" : "er"} valgt
              </p>
            )}
          </Step>
        )}

        {step === 3 && (
          <Step
            title="Hvor stor risiko vil du tage?"
            subtitle="Det styrer, hvor stor en del af den fulde Kelly-indsats vi anbefaler. Vælg roligt den forsigtige — de fleste bør."
          >
            <div className="flex flex-col gap-2">
              {RISK_OPTIONS.map((o) => {
                const on = risk === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setRisk(o.value)}
                    className={cn(
                      "flex items-start gap-3 rounded-[var(--radius-sm)] border px-3.5 py-3 text-left transition-colors",
                      on
                        ? "border-primary/40 bg-primary/[0.06]"
                        : "border-line bg-surface-2/40 hover:border-line-strong",
                    )}
                  >
                    <Tick on={on} className="mt-0.5" />
                    <span>
                      <span className="block text-[13px] font-semibold text-fg">
                        {o.label}
                      </span>
                      <span className="text-[11px] leading-relaxed text-subtle">
                        {o.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Step>
        )}

        {step === 4 && (
          <Step
            title="Skal AI'en spille med for dig?"
            subtitle="Auto-follow lægger automatisk de stærkeste nye value bets i din portefølje som åbne spil — med den anbefalede indsats. Du afgør dem stadig selv."
          >
            <div className="rounded-[var(--radius-sm)] border border-line bg-surface-2/40 p-3.5">
              <Switch
                id="ob-autofollow"
                checked={autoFollow}
                onChange={setAutoFollow}
                label="Følg AI'ens picks automatisk"
                description="Kan altid slås fra igen på din profil."
              />
              {autoFollow && (
                <label className="mt-3 block border-t border-line pt-3">
                  <span className="mb-1.5 block text-[11px] font-medium text-muted">
                    Følg kun bets over
                  </span>
                  <div className="relative w-32">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={autoFollowPct}
                      onChange={(e) =>
                        setAutoFollowPct(Number(e.target.value))
                      }
                      className="tabular pr-7"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-subtle">
                      %
                    </span>
                  </div>
                </label>
              )}
            </div>
            {!autoFollow && (
              <p className="text-[11px] leading-relaxed text-subtle">
                Ellers markerer AI&apos;en bare spillene i feedet, og du tilføjer
                dem selv med ét tryk.
              </p>
            )}
          </Step>
        )}

        {step === 5 && (
          <Step
            title="Hvad vil du have besked om?"
            subtitle="Vælg fra — resten kan du finjustere på profilen bagefter."
          >
            <div className="flex flex-col divide-y divide-line rounded-[var(--radius-sm)] border border-line bg-surface-2/40">
              {NOTIF_OPTIONS.map((o) => (
                <div key={o.key} className="px-3.5 py-3">
                  <Switch
                    id={`ob-${o.key}`}
                    checked={notif[o.key]}
                    onChange={(v) =>
                      setNotif((n) => ({ ...n, [o.key]: v }))
                    }
                    label={o.label}
                    description={o.desc}
                  />
                </div>
              ))}
            </div>
          </Step>
        )}

        {step === 6 && (
          <Step
            title="Og til sidst — hvordan skal den se ud?"
            subtitle="Vises med det samme. Alt kan skiftes igen under Profil → Udseende."
          >
            <AppearancePanel value={appearance} onChange={setAppearance} />
          </Step>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={pending}
            className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50"
          >
            <ArrowLeft className="size-4" />
            Tilbage
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={next}
          disabled={!canNext || pending}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-5",
            "text-[13px] font-semibold text-primary-contrast transition-colors",
            "hover:bg-primary-strong disabled:opacity-50",
          )}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : last ? (
            <>
              <Sparkles className="size-4" />
              Åbn mit feed
            </>
          ) : (
            <>
              Videre
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-lg font-semibold text-fg">{title}</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Tick({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-full border transition-colors",
        on
          ? "border-primary bg-primary text-primary-contrast"
          : "border-line-strong",
        className,
      )}
    >
      {on && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
}
