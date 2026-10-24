"use client";

import * as React from "react";
import type { Bookmaker, League, ValueOpportunity } from "@/types";
import { BetFormModal } from "@/components/portfolio/bet-form-modal";
import { ValueBetCard } from "./value-bet-card";
import { ValueDetailDrawer } from "./value-detail-drawer";
import type { TrackedBet } from "./value-feed";

/**
 * A plain grid of value-bet cards with the same open-drawer / log-bet wiring as
 * the main feed — for pages that list a subset (a match, a league).
 */
export function OpportunityGrid({
  opportunities,
  bookmakers,
  leagues,
  bankroll,
  trackedBets = {},
  kellyFraction = 0.25,
  stakeRounding = 10,
}: {
  opportunities: ValueOpportunity[];
  bookmakers: Bookmaker[];
  leagues: League[];
  bankroll: number;
  trackedBets?: Record<string, TrackedBet>;
  kellyFraction?: number;
  stakeRounding?: number;
}) {
  const [detail, setDetail] = React.useState<ValueOpportunity | null>(null);
  const [logTarget, setLogTarget] = React.useState<ValueOpportunity | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  const openLog = (o: ValueOpportunity) => {
    setDetail(null);
    setLogTarget(o);
    setModalOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {opportunities.map((o, i) => (
          <ValueBetCard
            key={o.id}
            opportunity={o}
            onOpen={setDetail}
            trackedBet={trackedBets[o.id]}
            index={i}
            bankroll={bankroll}
            kellyFraction={kellyFraction}
            stakeRounding={stakeRounding}
          />
        ))}
      </div>

      <ValueDetailDrawer
        opportunity={detail}
        bankroll={bankroll}
        kellyFraction={kellyFraction}
        stakeRounding={stakeRounding}
        tracked={detail ? detail.id in trackedBets : false}
        trackedStake={detail ? trackedBets[detail.id]?.stake : undefined}
        onClose={() => setDetail(null)}
        onLog={openLog}
      />

      <BetFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        bookmakers={bookmakers}
        leagues={leagues}
        opportunity={logTarget}
      />
    </>
  );
}
