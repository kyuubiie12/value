"use client";

import * as React from "react";
import { SearchX } from "lucide-react";
import type {
  Bookmaker,
  League,
  MarketType,
  ValueFilters,
  ValueOpportunity,
} from "@/types";
import { filterOpportunities } from "@/lib/filtering";
import { valueScore } from "@/lib/value-score";
import { EmptyState } from "@/components/shared/empty-state";
import { LeagueBadge } from "@/components/shared/league-badge";
import { BetFormModal } from "@/components/portfolio/bet-form-modal";
import { ValueFilterBar, type FeedView } from "./value-filter-bar";
import { FeedPrimer } from "./feed-primer";
import { ValueBetCard } from "./value-bet-card";
import { ValueBetTable } from "./value-bet-table";
import { HeroValueBet } from "./hero-value-bet";
import { ValueDetailDrawer } from "./value-detail-drawer";

type ViewMode = FeedView;

/** Open ("jeg spiller med") bet on a value opportunity. */
export interface TrackedBet {
  stake: number;
  odds: number;
  /** Logged automatically by auto-follow rather than by the user. */
  auto?: boolean;
}

export function ValueFeed({
  opportunities,
  bookmakers,
  leagues,
  bankroll,
  favoriteLeagueIds = [],
  trackedBets = {},
  kellyFraction = 0.25,
  stakeRounding = 10,
}: {
  opportunities: ValueOpportunity[];
  bookmakers: Bookmaker[];
  leagues: League[];
  bankroll: number;
  favoriteLeagueIds?: string[];
  trackedBets?: Record<string, TrackedBet>;
  kellyFraction?: number;
  stakeRounding?: number;
}) {
  const [filters, setFilters] = React.useState<ValueFilters>({ sort: "score-desc" });
  const [view, setView] = React.useState<ViewMode>("cards");
  const [detailTarget, setDetailTarget] = React.useState<ValueOpportunity | null>(null);
  const [logTarget, setLogTarget] = React.useState<ValueOpportunity | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  const markets = React.useMemo(
    () => [...new Set(opportunities.map((o) => o.market))] as MarketType[],
    [opportunities],
  );
  const feedLeagues = React.useMemo(
    () => leagues.filter((l) => opportunities.some((o) => o.leagueId === l.id)),
    [leagues, opportunities],
  );
  const feedBookmakers = React.useMemo(
    () =>
      bookmakers.filter((b) =>
        opportunities.some((o) => o.quotes.some((q) => q.bookmakerId === b.id)),
      ),
    [bookmakers, opportunities],
  );

  const hero = React.useMemo(
    () => [...opportunities].sort((a, b) => valueScore(b) - valueScore(a))[0] ?? null,
    [opportunities],
  );

  const filtered = React.useMemo(
    () => filterOpportunities(opportunities, filters),
    [opportunities, filters],
  );

  const noFilters =
    !filters.leagueIds?.length &&
    !filters.markets?.length &&
    !filters.bookmakerIds?.length &&
    !filters.movement &&
    !filters.minEdge &&
    !filters.withinHours &&
    !filters.search;

  const showHero = noFilters && hero !== null;
  const listed = showHero ? filtered.filter((o) => o.id !== hero!.id) : filtered;

  const grouped = React.useMemo(() => {
    const map = new Map<string, ValueOpportunity[]>();
    for (const o of listed) {
      const list = map.get(o.leagueId) ?? [];
      list.push(o);
      map.set(o.leagueId, list);
    }
    const fav = new Set(favoriteLeagueIds);
    return [...map.entries()].sort((a, b) => {
      const favA = fav.has(a[0]) ? 1 : 0;
      const favB = fav.has(b[0]) ? 1 : 0;
      if (favA !== favB) return favB - favA;
      const bestA = Math.max(...a[1].map((o) => o.edgePercent));
      const bestB = Math.max(...b[1].map((o) => o.edgePercent));
      return bestB - bestA;
    });
  }, [listed, favoriteLeagueIds]);

  const openDetail = (o: ValueOpportunity) => setDetailTarget(o);
  const openLog = (o: ValueOpportunity) => {
    setDetailTarget(null);
    setLogTarget(o);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-5">
      {showHero && (
        <HeroValueBet
          opportunity={hero!}
          onOpen={openDetail}
          tracked={hero!.id in trackedBets}
        />
      )}

      <ValueFilterBar
        filters={filters}
        onChange={setFilters}
        bookmakers={feedBookmakers}
        leagues={feedLeagues}
        markets={markets}
        resultCount={filtered.length}
        view={view}
        onViewChange={setView}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Ingen value bets matcher dine filtre"
          description="Prøv at sænke minimums-EV eller udvide ligaer og bookmakere."
        />
      ) : view === "table" ? (
        <ValueBetTable
          opportunities={filtered}
          onOpen={openDetail}
          trackedBets={trackedBets}
        />
      ) : view === "grouped" ? (
        <div className="flex flex-col gap-7">
          {grouped.map(([leagueId, opps]) => (
            <section key={leagueId} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-line pb-2">
                <LeagueBadge
                  leagueId={leagueId}
                  showCountry
                  className="text-[13px] font-medium text-fg"
                />
                <span className="tabular ml-auto text-[11px] text-subtle">
                  {opps.length} value {opps.length === 1 ? "bet" : "bets"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                {opps.map((o, i) => (
                  <ValueBetCard
                    key={o.id}
                    opportunity={o}
                    onOpen={openDetail}
                    trackedBet={trackedBets[o.id]}
                    index={i}
                    bankroll={bankroll}
                    kellyFraction={kellyFraction}
                    stakeRounding={stakeRounding}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {listed.map((o, i) => (
            <ValueBetCard
              key={o.id}
              opportunity={o}
              onOpen={openDetail}
              trackedBet={trackedBets[o.id]}
              index={i}
              bankroll={bankroll}
              kellyFraction={kellyFraction}
              stakeRounding={stakeRounding}
            />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="pt-1">
          <FeedPrimer />
        </div>
      )}

      <ValueDetailDrawer
        opportunity={detailTarget}
        bankroll={bankroll}
        kellyFraction={kellyFraction}
        stakeRounding={stakeRounding}
        tracked={detailTarget ? detailTarget.id in trackedBets : false}
        trackedStake={
          detailTarget ? trackedBets[detailTarget.id]?.stake : undefined
        }
        onClose={() => setDetailTarget(null)}
        onLog={openLog}
      />

      <BetFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        bookmakers={bookmakers}
        leagues={leagues}
        opportunity={logTarget}
      />
    </div>
  );
}
