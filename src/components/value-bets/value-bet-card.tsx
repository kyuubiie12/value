"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Sparkles } from "lucide-react";
import type { ValueOpportunity } from "@/types";
import { getLeague, DEFAULT_SETTINGS } from "@/lib/mock-data";
import { suggestedStake } from "@/lib/betting-math";
import { trackOpportunityAction, untrackOpportunityAction } from "@/lib/actions";
import {
  formatCountdown,
  formatCurrency,
  formatOdds,
  formatPercent,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { LeagueCode } from "@/components/shared/league-badge";
import { BookmakerLogo } from "@/components/shared/bookmaker-logo";
import type { TrackedBet } from "./value-feed";

export function ValueBetCard({
  opportunity,
  onOpen,
  trackedBet,
  index = 0,
  bankroll = DEFAULT_SETTINGS.startingBankroll,
  kellyFraction = DEFAULT_SETTINGS.kellyFraction,
  stakeRounding = DEFAULT_SETTINGS.stakeRounding,
}: {
  opportunity: ValueOpportunity;
  onOpen: (o: ValueOpportunity) => void;
  trackedBet?: TrackedBet;
  index?: number;
  bankroll?: number;
  kellyFraction?: number;
  stakeRounding?: number;
}) {
  const o = opportunity;
  const league = getLeague(o.leagueId);
  const router = useRouter();

  const [optimistic, setOptimistic] = React.useState<boolean | null>(null);
  const [trackPending, startTrack] = React.useTransition();
  const serverTracked = trackedBet !== undefined;
  const serverStake = trackedBet?.stake ?? 0;

  // Drop the optimistic override once the server data has caught up.
  const [synced, setSynced] = React.useState({ t: serverTracked, s: serverStake });
  if (synced.t !== serverTracked || synced.s !== serverStake) {
    setSynced({ t: serverTracked, s: serverStake });
    setOptimistic(null);
  }
  const tracked = optimistic ?? serverTracked;

  const recommendedStake = React.useMemo(
    () => suggestedStake(o.kellyFraction, kellyFraction, bankroll, stakeRounding),
    [o.kellyFraction, kellyFraction, bankroll, stakeRounding],
  );

  const quickToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trackPending) return;
    const next = !tracked;
    setOptimistic(next);
    startTrack(async () => {
      try {
        if (next) await trackOpportunityAction(o.id, recommendedStake);
        else await untrackOpportunityAction(o.id);
        router.refresh();
      } catch {
        setOptimistic(!next);
      }
    });
  };

  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const strong = o.expectedValue >= 0.05;
  const edgeTone = strong
    ? "text-primary-strong"
    : o.expectedValue >= 0.03
      ? "text-primary-strong/80"
      : "text-warning";
  const barFill = Math.min(94, Math.max(16, o.expectedValue * 100 * 6));

  return (
    <Card
      interactive
      role="button"
      tabIndex={0}
      aria-label={`${o.homeTeam} mod ${o.awayTeam} — ${o.selection}, åbn analyse`}
      onClick={() => onOpen(o)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(o);
        }
      }}
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
      className={cn(
        "card-enter group/card flex cursor-pointer flex-col gap-3.5 p-4 outline-none",
        "transition-[border-color,transform,box-shadow] duration-200",
        "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-md)]",
        "focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/30",
      )}
    >
      {/* Fixture + status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <LeagueCode
            code={league?.shortName ?? "?"}
            accent={league?.accent}
          />
          <p className="fixture-name truncate text-[15px] font-semibold text-fg">
            {o.homeTeam}
            <span className="mx-1.5 font-normal text-subtle">vs</span>
            {o.awayTeam}
          </p>
        </div>
        {tracked ? (
          trackedBet?.auto ? (
            <Chip
              tone="primary"
              icon={<Sparkles className="size-2.5" strokeWidth={2.5} />}
            >
              Auto
            </Chip>
          ) : (
            <Chip tone="warning">Afventer</Chip>
          )
        ) : (
          !o.read && (
            <span
              aria-label="Nyt"
              className="size-1.5 shrink-0 rounded-full bg-primary"
            />
          )
        )}
      </div>

      {/* Pick + kickoff */}
      <div className="-mt-1 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] text-muted">
          <span className="font-medium text-fg">{o.selection}</span>
          <span className="text-subtle"> · {o.marketLabel}</span>
        </p>
        <span
          className="tabular shrink-0 text-[11px] text-subtle"
          suppressHydrationWarning
        >
          {formatCountdown(o.startsAt, now)}
        </span>
      </div>

      {/* Price row — odds → value-margin bar → edge */}
      <div className="flex items-center gap-3">
        <BookmakerLogo bookmakerId={o.bestBookmakerId} size="md" />
        <span className="tabular text-[26px] font-bold leading-none tracking-tight text-fg">
          {formatOdds(o.bestOdds)}
        </span>
        <div
          aria-hidden
          className="relative h-1 min-w-6 flex-1 overflow-hidden rounded-full bg-surface-3"
        >
          <div
            className={cn(
              "h-full rounded-full",
              strong ? "bg-primary" : "bg-warning/80",
            )}
            style={{ width: `${barFill}%` }}
          />
        </div>
        <span
          className={cn("tabular shrink-0 text-[13px] font-semibold", edgeTone)}
        >
          {formatPercent(o.expectedValue, { signed: true })}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-line/70 pt-3">
        <span className="text-[11px] text-subtle">
          {tracked ? (
            <>
              Fair{" "}
              <span className="tabular">{formatOdds(o.fairOdds)}</span>
              <span className="text-subtle/60"> · {o.booksCount} bøger</span>
            </>
          ) : (
            <>
              Anbefalet{" "}
              <span className="tabular font-medium text-muted">
                {formatCurrency(recommendedStake)}
              </span>
              <span className="text-subtle/60">
                {" "}
                · fair {formatOdds(o.fairOdds)}
              </span>
            </>
          )}
        </span>
        {tracked ? (
          trackedBet ? (
            <div className="flex items-center gap-3.5 text-right">
              <Figure label="Indsats" value={formatCurrency(trackedBet.stake)} />
              <Figure
                label="Gevinst"
                value={formatCurrency(trackedBet.stake * trackedBet.odds)}
                tone="positive"
              />
            </div>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-primary-strong">
              {trackPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Check className="size-3" strokeWidth={3} />
              )}
              Tilføjet
            </span>
          )
        ) : (
          <button
            type="button"
            onClick={quickToggle}
            disabled={trackPending}
            aria-label="Tilføj til mine spil"
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-strong transition-colors hover:bg-primary/18 disabled:opacity-50"
          >
            {trackPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Plus className="size-3" strokeWidth={3} />
            )}
            Spiller med
          </button>
        )}
      </div>
    </Card>
  );
}

function Chip({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode;
  tone: "primary" | "warning";
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone === "primary"
          ? "bg-primary/12 text-primary-strong"
          : "bg-warning/12 text-warning",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function Figure({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive";
}) {
  return (
    <div className="leading-tight">
      <p className="text-[9px] uppercase tracking-wide text-subtle">{label}</p>
      <p
        className={cn(
          "tabular text-[12px] font-semibold",
          tone === "positive" ? "text-positive" : "text-fg",
        )}
      >
        {value}
      </p>
    </div>
  );
}
