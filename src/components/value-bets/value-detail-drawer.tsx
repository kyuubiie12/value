"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ChartNoAxesCombined,
  Check,
  CircleCheckBig,
  Plus,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import type { MarketStatContext, ValueOpportunity } from "@/types";
import { DEFAULT_SETTINGS, getBookmaker } from "@/lib/mock-data";
import { fixtureHref } from "@/lib/fixtures";
import {
  markOpportunityReadAction,
  trackOpportunityAction,
  untrackOpportunityAction,
  updateTrackedStakeAction,
} from "@/lib/actions";
import {
  formatCurrency,
  formatKickoff,
  formatNumber,
  formatOdds,
  formatPercent,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EvIndicator } from "@/components/shared/ev-indicator";
import { LeagueBadge } from "@/components/shared/league-badge";
import { FairPills } from "@/components/shared/fair-pills";
import { BookmakerLogo } from "@/components/shared/bookmaker-logo";
import { OddsBoard } from "./odds-board";

/** Starting stake in the box — the user types their own. */
const DEFAULT_STAKE = 100;

export function ValueDetailDrawer({
  opportunity,
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
  const [isTracked, setIsTracked] = React.useState(tracked);
  const [stakeInput, setStakeInput] = React.useState("");
  const [trackPending, startTrackTransition] = React.useTransition();
  const [seenKey, setSeenKey] = React.useState<string | null>(null);
  if (drawerKey !== seenKey) {
    setSeenKey(drawerKey);
    setMarkedRead(false);
    setIsTracked(tracked);
    setStakeInput(String(trackedStake ?? DEFAULT_STAKE));
  }

  const stakeValue = Math.max(
    0,
    Math.round(Number(stakeInput.replace(",", ".")) || 0),
  );

  if (!open || typeof document === "undefined") return null;
  const o = opportunity;

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
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[var(--radius-lg)] border border-line-strong/70 bg-bg-elevated shadow-[var(--shadow-pop)] sm:max-h-[90vh] sm:rounded-[var(--radius-lg)]"
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
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={fixtureHref(o)}
                className="glow-hover inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-surface-2/60 px-3 py-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-fg"
              >
                Kampside
                <ArrowRight className="size-3" aria-hidden />
              </Link>
              <Link
                href={`/leagues/${o.leagueId}`}
                className="glow-hover inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-surface-2/60 px-3 py-1.5 text-[11.5px] font-medium text-muted transition-colors hover:text-fg"
              >
                {o.league}
                <ArrowRight className="size-3" aria-hidden />
              </Link>
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
              <span />
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
              fairBasis={o.fairBasis}
            />
          </div>

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

/**
 * The evidence panel for counting-stat markets (corners, cards): each
 * team's own average, the head-to-head average as the hero figure, and a
 * threshold bar showing where that average actually sits versus the line
 * being bet on. Given its own accent-toned card (unlike every other section
 * in this drawer) because the user explicitly asked for the numbers behind
 * a pick to be the most convincing, most visible thing here — not a
 * footnote next to the AI reasoning.
 */
export function LineDataPanel({
  s,
  homeTeam,
  awayTeam,
  selection,
}: {
  s: MarketStatContext;
  homeTeam: string;
  awayTeam: string;
  selection: string;
}) {
  // Team-total selections read "Leeds over 1.5 mål" — the team name sits
  // in front of "over", so this can't be a prefix check. Match "over"/
  // "under" as whole words anywhere in the string instead.
  const selectionLower = selection.toLowerCase();
  const isUnderPick = /\bunder\b/.test(selectionLower);
  const isOverPick = !isUnderPick;
  const h2hAboveLine = s.h2hAvg >= s.line;
  const supportsPick = isOverPick ? h2hAboveLine : !h2hAboveLine;
  const gap = Math.abs(s.h2hAvg - s.line);

  const domainMax = Math.max(s.h2hAvg, s.line) * 1.25;
  const fillPct = Math.min(100, (s.h2hAvg / domainMax) * 100);
  const linePct = Math.min(100, (s.line / domainMax) * 100);

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-primary/25 bg-primary/[0.05] p-4">
      <div className="mb-4 flex items-center gap-1.5">
        <ChartNoAxesCombined className="size-3.5 text-primary" aria-hidden />
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-strong">
          Data bag linjen
        </p>
      </div>

      {/* Hero readout: head-to-head average is the number that matters most */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <p className="tabular font-display text-[36px] font-semibold leading-none text-fg">
            {formatNumber(s.h2hAvg, 1)}
          </p>
          <p className="mt-1.5 text-[11px] text-muted">
            Indbyrdes snit · {s.metric} · seneste {s.h2hMatches} opgør
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="tabular text-[16px] font-semibold text-fg">
              {formatNumber(s.homeAvg, 1)}
            </p>
            <p className="max-w-[7rem] truncate text-[10px] text-subtle">
              {homeTeam}
            </p>
          </div>
          <div className="text-right">
            <p className="tabular text-[16px] font-semibold text-fg">
              {formatNumber(s.awayAvg, 1)}
            </p>
            <p className="max-w-[7rem] truncate text-[10px] text-subtle">
              {awayTeam}
            </p>
          </div>
        </div>
      </div>

      {/* Threshold bar: the indbyrdes average filled in against the line */}
      <div className="mt-5">
        <div className="relative h-2 rounded-full bg-surface-3">
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              supportsPick ? "bg-primary" : "bg-warning/80",
            )}
            style={{ width: `${fillPct}%` }}
          />
          <div
            aria-hidden
            className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-fg/50"
            style={{ left: `${linePct}%` }}
          />
        </div>
        <div className="relative mt-1 h-3.5">
          <span
            className="absolute top-0 -translate-x-1/2 text-[9px] font-medium uppercase tracking-wide text-subtle"
            style={{ left: `${linePct}%` }}
          >
            Linje {formatNumber(s.line, 1)}
          </span>
        </div>
      </div>

      {/* Verdict — the actual over/under direction is a fact (h2hAvg vs
          line); whether that fact supports the pick is a separate question,
          so the two are never conflated into one always-positive claim. */}
      <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-sm)] bg-bg/50 p-2.5">
        <CircleCheckBig
          className={cn(
            "mt-0.5 size-3.5 shrink-0",
            supportsPick ? "text-positive" : "text-warning",
          )}
          aria-hidden
        />
        <p className="text-[12px] leading-relaxed text-fg">
          Indbyrdes-snittet ligger{" "}
          <span
            className={cn(
              "tabular font-semibold",
              supportsPick ? "text-positive" : "text-warning",
            )}
          >
            {formatNumber(gap, 1)} {s.metric} {h2hAboveLine ? "over" : "under"}
          </span>{" "}
          linjen på {formatNumber(s.line, 1)} —{" "}
          {supportsPick ? (
            <>
              historikken understøtter{" "}
              <span className="font-semibold">{selection}</span>.
            </>
          ) : (
            <>
              det trækker i den anden retning af{" "}
              <span className="font-semibold">{selection}</span> — vær
              opmærksom.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
