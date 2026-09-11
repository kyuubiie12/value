"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Sparkles } from "lucide-react";
import type { Bet, Currency } from "@/types";
import { getLeague } from "@/lib/mock-data";
import { reopenBetAction } from "@/lib/actions";
import {
  formatCurrency,
  formatDateTime,
  formatOdds,
  formatPercent,
  formatSignedCurrency,
  formatUnits,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { BookmakerLogo } from "@/components/shared/bookmaker-logo";
import { BetStatusBadge } from "@/components/shared/bet-status-badge";
import { LeagueCode } from "@/components/shared/league-badge";
import { SettleButtons } from "./settle-buttons";

export function BetDetailModal({
  bet,
  currency,
  onClose,
}: {
  bet: Bet | null;
  currency: Currency;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  if (!bet) return null;
  const league = getLeague(bet.leagueId);
  const pendingBet = bet.status === "pending";
  const tags = bet.tags ?? [];
  const auto = tags.includes("auto-follow");
  const fromAi = !!bet.sourceOpportunityId || tags.includes("ai-feed");
  const potential = bet.stake * bet.odds;

  const reopen = () =>
    start(async () => {
      await reopenBetAction(bet.id);
      router.refresh();
      onClose();
    });

  return (
    <Modal
      open={bet !== null}
      onClose={onClose}
      title={bet.event}
      description={`${bet.marketLabel} · ${bet.selection}`}
      footer={
        pendingBet ? (
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-[11px] text-subtle">Afgør spillet:</span>
            <SettleButtons betId={bet.id} onSettled={() => onClose()} />
          </div>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Luk
            </Button>
            <Button
              variant="outline"
              onClick={reopen}
              loading={pending}
              className="ml-auto"
            >
              <RotateCcw className="size-4" />
              Åbn igen
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-subtle">
          <LeagueCode
            code={league?.shortName ?? "?"}
            accent={league?.accent}
          />
          <span>{bet.league}</span>
          <span className="h-3 w-px bg-line" />
          <span>Placeret {formatDateTime(bet.placedAt)}</span>
          {bet.settledAt && (
            <>
              <span className="h-3 w-px bg-line" />
              <span>Afgjort {formatDateTime(bet.settledAt)}</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface p-4">
          <div className="flex items-center gap-2.5">
            <BookmakerLogo bookmakerId={bet.bookmakerId} size="lg" />
            <span className="tabular text-2xl font-bold leading-none text-primary-strong">
              {formatOdds(bet.odds)}
            </span>
          </div>
          <BetStatusBadge status={bet.status} />
        </div>

        {fromAi && (
          <p className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-primary/[0.07] px-3 py-2 text-[12px] text-primary-strong">
            <Sparkles className="size-3.5" />
            {auto ? "Auto-fulgt fra AI-feedet" : "Fundet i AI-feedet"}
            {typeof bet.expectedValue === "number" &&
              ` · +${(bet.expectedValue * 100).toFixed(1)}% EV ved indgang`}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Stat label="Indsats" value={formatCurrency(bet.stake, currency)}
            sub={formatUnits(bet.stakeUnits)} />
          <Stat
            label={pendingBet ? "Mulig gevinst" : "Udbetaling"}
            value={formatCurrency(pendingBet ? potential : bet.payout, currency)}
          />
          <Stat
            label="Resultat"
            value={
              pendingBet ? "–" : formatSignedCurrency(bet.profit, currency)
            }
            tone={
              pendingBet
                ? "neutral"
                : bet.profit > 0
                  ? "positive"
                  : bet.profit < 0
                    ? "negative"
                    : "neutral"
            }
          />
          <Stat
            label="Slutodds"
            value={bet.closingOdds ? formatOdds(bet.closingOdds) : "–"}
          />
          <Stat
            label="CLV"
            value={
              typeof bet.clvPercent === "number"
                ? `${bet.clvPercent > 0 ? "+" : ""}${bet.clvPercent.toFixed(1)}%`
                : "–"
            }
            tone={
              typeof bet.clvPercent === "number"
                ? bet.clvPercent >= 0
                  ? "positive"
                  : "negative"
                : "neutral"
            }
          />
          <Stat
            label="EV ved indgang"
            value={
              typeof bet.expectedValue === "number"
                ? formatPercent(bet.expectedValue, { signed: true })
                : "–"
            }
          />
        </div>

        {bet.notes && (
          <div className="rounded-[var(--radius-sm)] border border-line bg-surface-2/50 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-subtle">
              Noter
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              {bet.notes}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2.5">
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
        {sub && (
          <span className="ml-1.5 text-[11px] font-normal text-subtle">
            {sub}
          </span>
        )}
      </p>
    </div>
  );
}
