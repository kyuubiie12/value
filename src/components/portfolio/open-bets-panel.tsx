"use client";

import * as React from "react";
import type { Bet, Currency } from "@/types";
import { getLeague } from "@/lib/mock-data";
import { formatCountdown, formatCurrency, formatOdds } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LeagueCode } from "@/components/shared/league-badge";
import { BookmakerLogo } from "@/components/shared/bookmaker-logo";
import { SettleButtons } from "./settle-buttons";

function startMs(b: Bet) {
  return b.eventStartsAt
    ? new Date(b.eventStartsAt).getTime()
    : Number.MAX_SAFE_INTEGER;
}

/** The open ("afventer") bets, with a live countdown and one-tap settling. */
export function OpenBetsPanel({
  bets,
  currency,
}: {
  bets: Bet[];
  currency: Currency;
}) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const [hidden, setHidden] = React.useState<Set<string>>(() => new Set());
  const hide = (id: string) =>
    setHidden((s) => {
      const next = new Set(s);
      next.add(id);
      return next;
    });

  const open = React.useMemo(
    () =>
      bets
        .filter((b) => b.status === "pending" && !hidden.has(b.id))
        .sort((a, b) => startMs(a) - startMs(b)),
    [bets, hidden],
  );

  if (open.length === 0) return null;

  const staked = open.reduce((s, b) => s + b.stake, 0);
  const potential = open.reduce((s, b) => s + b.stake * b.odds, 0);
  const readyCount = open.filter((b) => {
    const k = b.eventStartsAt ? new Date(b.eventStartsAt).getTime() : null;
    return k !== null && now > k + 2 * 3_600_000;
  }).length;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-fg">
          Åbne spil
          <span className="tabular rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-subtle">
            {open.length}
          </span>
          {readyCount > 0 && (
            <span className="tabular rounded-full bg-warning/15 px-1.5 py-0.5 text-[11px] font-medium text-warning">
              {readyCount} klar
            </span>
          )}
        </h2>
        <span className="tabular text-[11px] text-subtle">
          {formatCurrency(staked, currency)} i spil · kan indbringe{" "}
          <span className="text-positive">{formatCurrency(potential, currency)}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {open.map((b) => {
          const league = getLeague(b.leagueId);
          const kickoff = b.eventStartsAt
            ? new Date(b.eventStartsAt).getTime()
            : null;
          const ready = kickoff !== null && now > kickoff + 2 * 3_600_000;
          const live =
            kickoff !== null && now >= kickoff && now <= kickoff + 2 * 3_600_000;

          return (
            <div
              key={b.id}
              className={cn(
                "flex flex-col gap-3 rounded-card border bg-surface p-4 transition-colors",
                ready ? "border-warning/35" : "border-line",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="fixture-name truncate text-[14px] font-semibold text-fg">
                    {b.event}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-subtle">
                    <LeagueCode
                      code={league?.shortName ?? "?"}
                      accent={league?.accent}
                    />
                    {b.tags?.includes("auto-follow") && (
                      <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary-strong">
                        Auto
                      </span>
                    )}
                    <span className="truncate">
                      {b.marketLabel} · {b.selection}
                    </span>
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    ready
                      ? "bg-warning/15 text-warning"
                      : live
                        ? "bg-primary/15 text-primary-strong"
                        : "bg-surface-2 text-subtle",
                  )}
                >
                  {ready
                    ? "Klar til afgørelse"
                    : live
                      ? "Kampen er i gang"
                      : kickoff !== null
                        ? formatCountdown(b.eventStartsAt as string, now)
                        : "Åbent"}
                </span>
              </div>

              <div className="flex items-center justify-between border-y border-line/60 py-2 text-[12px]">
                <span className="flex items-center gap-2 text-muted">
                  <BookmakerLogo bookmakerId={b.bookmakerId} size="sm" />
                  <span className="tabular">{formatOdds(b.odds)}</span>
                </span>
                <span className="tabular text-muted">
                  {formatCurrency(b.stake, currency)}
                  <span className="mx-1.5 text-subtle">→</span>
                  <span className="font-semibold text-positive">
                    {formatCurrency(b.stake * b.odds, currency)}
                  </span>
                </span>
              </div>

              <SettleButtons betId={b.id} onSettled={() => hide(b.id)} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
