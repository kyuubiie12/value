"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";
import type { ValueOpportunity } from "@/types";
import { valueScore, valueScoreLabel, valueScoreTone } from "@/lib/value-score";
import { formatKickoff, formatOdds } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FormGuide } from "@/components/shared/form-guide";
import { LeagueBadge } from "@/components/shared/league-badge";
import { PriceMovementTag } from "@/components/shared/price-movement";
import { BookmakerLogo } from "@/components/shared/bookmaker-logo";
import { ValueScoreDial } from "./value-score-dial";
import { ValueBar } from "./value-bar";

const firstName = (team: string) => team.split(" ")[0];

export function HeroValueBet({
  opportunity,
  onOpen,
  tracked = false,
}: {
  opportunity: ValueOpportunity;
  onOpen: (o: ValueOpportunity) => void;
  tracked?: boolean;
}) {
  const o = opportunity;
  const score = valueScore(o);
  const toneText =
    valueScoreTone(score) === "primary"
      ? "text-primary-strong"
      : valueScoreTone(score) === "positive"
        ? "text-positive"
        : "text-warning";

  return (
    <button
      type="button"
      onClick={() => onOpen(o)}
      className={cn(
        "spot group relative w-full overflow-hidden [&::after]:inset-0 rounded-card-lg border border-primary/20 bg-surface p-5 text-left outline-none sm:p-6",
        "transition-[border-color,box-shadow] duration-200",
        "hover:border-primary/40 hover:shadow-[var(--shadow-md)]",
        "focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/35",
      )}
    >
      <div className="relative grid gap-5 sm:grid-cols-[1fr_auto] sm:gap-7">
        {/* Left — the story */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-strong">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5" aria-hidden />
                Dagens bedste value
              </span>
              {tracked && (
                <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 tracking-normal normal-case">
                  <Check className="size-3" strokeWidth={3} />
                  Spiller med
                </span>
              )}
            </span>
            {/* Score — top-right on mobile, moves into the panel on sm+ */}
            <div className="flex shrink-0 flex-col items-center gap-1 sm:hidden">
              <ValueScoreDial score={score} size={54} showLabel={false} />
              <span className={cn("text-[10px] font-semibold", toneText)}>
                {valueScoreLabel(score)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-subtle">
            <LeagueBadge leagueId={o.leagueId} />
            <span>{formatKickoff(o.startsAt)}</span>
            {o.priceMovement === "shortening" && (
              <PriceMovementTag movement="shortening" />
            )}
          </div>

          <div>
            <h2 className="font-display text-[1.65rem] font-semibold leading-[1.08] tracking-tight text-fg sm:text-[2.15rem]">
              {o.homeTeam}
              <span className="font-normal text-subtle"> vs </span>
              {o.awayTeam}
            </h2>
            <p className="mt-2 text-[13px]">
              <span className="font-semibold text-fg">{o.selection}</span>
              <span className="text-subtle"> · {o.marketLabel}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <FormGuide form={o.homeForm} label={firstName(o.homeTeam)} />
            <FormGuide form={o.awayForm} label={firstName(o.awayTeam)} />
          </div>

          {o.signals.length > 0 && (
            <ul className="mt-1 flex flex-col gap-1 border-t border-line/60 pt-3 text-[12px] text-muted">
              {o.signals.slice(0, 2).map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/60" />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right — the readout panel */}
        <div className="flex flex-col justify-between gap-5 rounded-card bg-bg/45 p-4 ring-1 ring-inset ring-line/50 sm:min-w-[220px] sm:p-5">
          <div className="hidden items-center gap-3 sm:flex">
            <ValueScoreDial score={score} size={58} showLabel={false} />
            <div>
              <p className={cn("text-[13px] font-semibold", toneText)}>
                {valueScoreLabel(score)}
              </p>
              <p className="text-[10px] uppercase tracking-[0.1em] text-subtle">
                Value score
              </p>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 sm:block">
            <div>
              <BookmakerLogo bookmakerId={o.bestBookmakerId} size="md" />
              <div className="mt-2 tabular text-[2.4rem] font-bold leading-none tracking-tight text-primary-strong">
                {formatOdds(o.bestOdds)}
              </div>
            </div>
            <ValueBar
              fairOdds={o.fairOdds}
              edge={o.expectedValue}
              className="w-40 pb-1 sm:mt-3 sm:w-full"
            />
          </div>

          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-primary-strong">
            Åbn analyse
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </button>
  );
}
