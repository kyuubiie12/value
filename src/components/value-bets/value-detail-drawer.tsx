"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { MarketPerformance, ValueOpportunity } from "@/types";
import type { OpportunityInsight } from "@/lib/services";
import { DEFAULT_SETTINGS, getBookmaker } from "@/lib/mock-data";
import { suggestedStake } from "@/lib/betting-math";
import { valueScore, valueScoreLabel } from "@/lib/value-score";
import {
  analyseOpportunityAction,
  markOpportunityReadAction,
  trackOpportunityAction,
  untrackOpportunityAction,
  updateTrackedStakeAction,
} from "@/lib/actions";
import { formatCurrency, formatKickoff, formatOdds, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EvIndicator } from "@/components/shared/ev-indicator";
import { LeagueBadge } from "@/components/shared/league-badge";
import { FairPills } from "@/components/shared/fair-pills";
import { FormGuide } from "@/components/shared/form-guide";
import { PriceMovementTag } from "@/components/shared/price-movement";
import { BookmakerLogo } from "@/components/shared/bookmaker-logo";
import { ValueScoreDial } from "./value-score-dial";
import { OddsBoard } from "./odds-board";
import { KellyStakePanel } from "./kelly-stake";

export function ValueDetailDrawer({
  opportunity,
  bankroll,
  kellyFraction = DEFAULT_SETTINGS.kellyFraction,
  stakeRounding = DEFAULT_SETTINGS.stakeRounding,
  tracked = false,
  trackedStake,
  onClose,
  onLog,
}: {
  opportunity: ValueOpportunity | null;
  bankroll: number;
  kellyFraction?: number;
  stakeRounding?: number;
  tracked?: boolean;
  trackedStake?: number;
  onClose: () => void;
  onLog: (o: ValueOpportunity) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [markedRead, setMarkedRead] = React.useState(false);
  const [shared, setShared] = React.useState(false);
  const open = opportunity !== null;

  // Recommended stake = fractional Kelly against the bankroll, rounded.
  const recommendedStake = React.useMemo(
    () =>
      opportunity
        ? suggestedStake(
            opportunity.kellyFraction,
            kellyFraction,
            bankroll,
            stakeRounding,
          )
        : 0,
    [opportunity, kellyFraction, bankroll, stakeRounding],
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const drawerKey = opportunity?.id ?? null;
  const [insight, setInsight] = React.useState<OpportunityInsight | null>(null);
  const [marketPerf, setMarketPerf] = React.useState<MarketPerformance | null>(null);
  const [insightLoading, setInsightLoading] = React.useState(false);
  const [isTracked, setIsTracked] = React.useState(tracked);
  const [stakeInput, setStakeInput] = React.useState("");
  const [trackPending, startTrackTransition] = React.useTransition();
  const [seenKey, setSeenKey] = React.useState<string | null>(null);
  if (drawerKey !== seenKey) {
    setSeenKey(drawerKey);
    setMarkedRead(false);
    setInsight(null);
    setMarketPerf(null);
    setInsightLoading(drawerKey !== null);
    setIsTracked(tracked);
    setStakeInput(String(trackedStake ?? recommendedStake));
  }

  const stakeValue = Math.max(
    0,
    Math.round(Number(stakeInput.replace(",", ".")) || 0),
  );

  React.useEffect(() => {
    if (!drawerKey) return;
    let cancelled = false;
    analyseOpportunityAction(drawerKey)
      .then((r) => {
        if (cancelled || !r) return;
        setInsight(r.insight);
        setMarketPerf(r.marketPerformance);
      })
      .finally(() => {
        if (!cancelled) setInsightLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [drawerKey]);

  if (!open || typeof document === "undefined") return null;
  const o = opportunity;
  const score = valueScore(o);
  const edgeVsFair = o.bestOdds / o.fairOdds - 1;

  const markRead = () => {
    startTransition(async () => {
      await markOpportunityReadAction(o.id);
      setMarkedRead(true);
    });
  };

  const sharePick = async () => {
    const line = [
      `${o.homeTeam} v ${o.awayTeam} — ${o.selection}`,
      `${formatOdds(o.bestOdds)} hos ${
        getBookmaker(o.bestBookmakerId)?.name ?? o.bestBookmakerId
      } · ${formatPercent(o.expectedValue, { signed: true })} value (fair ${formatOdds(
        o.fairOdds,
      )})`,
      `Fundet af ValueBet AI`,
    ].join("\n");
    try {
      if (navigator.share) await navigator.share({ text: line });
      else await navigator.clipboard.writeText(line);
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      /* user cancelled the share sheet */
    }
  };

  const toggleTracked = () => {
    if (trackPending) return;
    const next = !isTracked;
    if (next && stakeValue <= 0) return;
    setIsTracked(next); // optimistic
    if (next) setMarkedRead(true);
    startTrackTransition(async () => {
      try {
        if (next) await trackOpportunityAction(o.id, stakeValue);
        else await untrackOpportunityAction(o.id);
        router.refresh();
      } catch {
        setIsTracked(!next); // revert on failure
      }
    });
  };

  const saveStake = () => {
    if (trackPending || stakeValue <= 0) return;
    startTrackTransition(async () => {
      await updateTrackedStakeAction(o.id, stakeValue);
      router.refresh();
    });
  };

  const stakeDirty =
    isTracked && trackedStake !== undefined && stakeValue !== trackedStake;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-bg/80" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${o.homeTeam} mod ${o.awayTeam}`}
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[var(--radius-lg)] border border-line-strong bg-bg-elevated shadow-[var(--shadow-pop)] sm:max-h-[90vh] sm:rounded-[var(--radius-lg)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5 text-[11px] text-subtle">
            <LeagueBadge leagueId={o.leagueId} />
            <span>{formatKickoff(o.startsAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={sharePick}
              aria-label="Del dette value bet"
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[var(--radius-sm)] text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
            >
              {shared ? (
                <Check className="size-4 text-primary-strong" strokeWidth={3} />
              ) : (
                <Share2 className="size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Luk"
              className="-mr-1.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-[var(--radius-sm)] text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* Match */}
          <div>
            <p className="fixture-name text-lg font-semibold text-fg">
              {o.homeTeam} <span className="font-normal text-subtle">vs</span>{" "}
              {o.awayTeam}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <FormGuide form={o.homeForm} />
              <FormGuide form={o.awayForm} />
            </div>
          </div>

          {/* The bet */}
          <div className="rounded-[var(--radius)] border border-primary/25 bg-primary/[0.06] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-primary-strong">
              {o.marketLabel}
            </p>
            <p className="mt-0.5 text-base font-semibold text-fg">{o.selection}</p>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookmakerLogo bookmakerId={o.bestBookmakerId} size="lg" />
                <span className="tabular text-xl font-semibold leading-none text-fg">
                  {formatOdds(o.bestOdds)}
                </span>
              </div>
              <EvIndicator edge={o.expectedValue} size="lg" showLabel />
            </div>
            <FairPills
              opportunity={o}
              size="sm"
              className="mt-3 border-t border-primary/15 pt-3"
            />
          </div>

          {/* Verdict */}
          <div className="flex items-center gap-4 rounded-[var(--radius)] border border-line bg-surface p-4">
            <ValueScoreDial score={score} size={72} showLabel={false} />
            <div>
              <p className="text-[13px] font-semibold text-fg">
                {valueScoreLabel(score)} value ({score}/100)
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                Din pris slår fair odds med {formatPercent(edgeVsFair, { signed: true })}.
              </p>
              <div className="mt-1.5">
                <PriceMovementTag
                  movement={o.priceMovement}
                  openingOdds={o.openingOdds}
                  currentOdds={o.bestOdds}
                />
              </div>
            </div>
          </div>

          {/* Kelly */}
          <KellyStakePanel
            bestOdds={o.bestOdds}
            fairProbability={o.fairProbability}
            bankroll={bankroll}
          />

          {/* Spiller du med? — pick a stake, add with the footer button */}
          <div
            className={cn(
              "rounded-[var(--radius)] border p-3.5 transition-colors",
              isTracked
                ? "border-primary/40 bg-primary/[0.07]"
                : "border-line bg-surface",
              trackPending && "opacity-70",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-fg">
                {isTracked ? "Du spiller med" : "Spil med på denne"}
              </span>
              {isTracked && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-primary-strong">
                  <Check className="size-3.5" strokeWidth={3} />
                  I mine spil
                </span>
              )}
            </div>

            <div className="mt-3 flex items-end gap-3">
              <label className="flex-1">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-subtle">
                  Din indsats
                </span>
                <span className="flex items-center rounded-[var(--radius-sm)] border border-line bg-bg px-2.5 focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-ring/25">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={stakeInput}
                    onChange={(e) =>
                      setStakeInput(e.target.value.replace(/[^\d.,]/g, ""))
                    }
                    aria-label="Din indsats i kroner"
                    className="tabular w-full bg-transparent py-1.5 text-[15px] font-semibold text-fg outline-none"
                  />
                  <span className="text-[11px] text-subtle">
                    {DEFAULT_SETTINGS.currency}
                  </span>
                </span>
              </label>
              <div className="pb-1 text-right">
                <span className="block text-[10px] uppercase tracking-wide text-subtle">
                  Mulig gevinst
                </span>
                <span className="tabular text-[15px] font-semibold text-positive">
                  {formatCurrency(stakeValue * o.bestOdds, DEFAULT_SETTINGS.currency)}
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[10px] text-subtle">
                Anbefalet: {formatCurrency(recommendedStake, DEFAULT_SETTINGS.currency)}
                {stakeInput !== String(recommendedStake) && (
                  <button
                    type="button"
                    onClick={() => setStakeInput(String(recommendedStake))}
                    className="ml-1.5 cursor-pointer font-medium text-primary-strong hover:underline"
                  >
                    Brug
                  </button>
                )}
              </span>
              {isTracked && stakeDirty ? (
                <button
                  type="button"
                  onClick={saveStake}
                  disabled={trackPending || stakeValue <= 0}
                  className="cursor-pointer rounded-[var(--radius-sm)] bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-contrast transition-colors hover:bg-primary-strong disabled:opacity-50"
                >
                  Opdatér indsats
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onLog(o)}
                  className="cursor-pointer text-[10px] font-medium text-subtle hover:text-fg hover:underline"
                >
                  Angiv status / noter manuelt →
                </button>
              )}
            </div>
          </div>

          {/* Odds board */}
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-subtle">
              Odds hos {o.booksCount} bookmakere
            </p>
            <OddsBoard
              quotes={o.quotes}
              bestBookmakerId={o.bestBookmakerId}
              fairOdds={o.fairOdds}
            />
          </div>

          {/* AI analysis */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-subtle">
              <Sparkles className="size-3 text-primary" aria-hidden />
              AI-analyse
              {insightLoading && (
                <Loader2 className="size-3 animate-spin text-subtle" aria-hidden />
              )}
              {insight?.source === "ai" && (
                <span className="rounded-[3px] bg-primary/12 px-1 text-[9px] font-semibold text-primary-strong">
                  live
                </span>
              )}
            </p>

            {insight?.summary && (
              <p className="mb-2.5 text-[13px] leading-relaxed text-fg">
                {insight.summary}
              </p>
            )}

            <ul className="space-y-1.5">
              {(insight?.signals ?? o.signals).map((s) => (
                <li key={s} className="flex items-start gap-2 text-[13px] text-muted">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  {s}
                </li>
              ))}
            </ul>

            {insightLoading && !insight && (
              <p className="mt-2 text-[11px] text-subtle">Analyserer kampen…</p>
            )}
          </div>

          {/* Track record for this market */}
          {marketPerf && marketPerf.picks >= 5 && (
            <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">
                AI&apos;ens {o.marketLabel}-picks · track record
              </p>
              <div className="mt-2 grid grid-cols-3 gap-3 text-center">
                <PerfStat
                  label="Hit rate"
                  value={formatPercent(marketPerf.hitRate)}
                />
                <PerfStat
                  label="Yield"
                  value={formatPercent(marketPerf.roi, { signed: true })}
                  tone={marketPerf.roi >= 0 ? "positive" : "negative"}
                />
                <PerfStat
                  label="Gns. CLV"
                  value={formatPercent(marketPerf.avgClv, { signed: true })}
                  tone={marketPerf.avgClv >= 0 ? "positive" : "negative"}
                />
              </div>
              <p className="mt-2 text-[10px] text-subtle">
                Over {marketPerf.picks} afgjorte picks i dette marked.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-line px-5 py-3.5">
          {isTracked ? (
            <>
              <Button
                variant="ghost"
                onClick={toggleTracked}
                loading={trackPending}
                className="text-negative hover:bg-negative/10 hover:text-negative"
              >
                <Trash2 className="size-4" />
                Fjern spil
              </Button>
              <Link
                href="/portfolio"
                onClick={onClose}
                className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-line bg-surface-2 px-3.5 text-[13px] font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                Se i portefølje
                <ArrowRight className="size-3.5" />
              </Link>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={markRead}
                disabled={pending || markedRead || o.read}
              >
                {markedRead || o.read ? (
                  <>
                    <Check className="size-4" /> Læst
                  </>
                ) : (
                  "Marker læst"
                )}
              </Button>
              <Button
                className="ml-auto"
                onClick={toggleTracked}
                loading={trackPending}
                disabled={stakeValue <= 0}
              >
                <Plus className="size-4" />
                Tilføj til mine spil
              </Button>
            </>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function PerfStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="rounded-[6px] bg-bg px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wide text-subtle">{label}</p>
      <p
        className={
          "tabular mt-0.5 text-[13px] font-semibold " +
          (tone === "positive"
            ? "text-positive"
            : tone === "negative"
              ? "text-negative"
              : "text-fg")
        }
      >
        {value}
      </p>
    </div>
  );
}
