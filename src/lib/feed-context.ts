import "server-only";
import type { Bookmaker, League, UserSettings, ValueOpportunity } from "@/types";
import type { TrackedBet } from "@/components/value-bets/value-feed";
import { restrictOpportunityToBooks } from "@/lib/restrict-opportunity";
import {
  bookmakerService,
  leagueService,
  portfolioService,
  settingsService,
  valueService,
} from "@/lib/services";

export interface FeedContext {
  /** Value bets the user can actually play, above their EV floor, best first. */
  opportunities: ValueOpportunity[];
  /** Everything the scanner found, unfiltered by the user's books. */
  all: ValueOpportunity[];
  bookmakers: Bookmaker[];
  leagues: League[];
  settings: UserSettings;
  bankroll: number;
  trackedBets: Record<string, TrackedBet>;
}

/** The per-user data every page that lists value bets needs (match, league). */
export async function loadFeedContext(): Promise<FeedContext> {
  const [all, bookmakers, leagues, stats, settings, bets] = await Promise.all([
    valueService.listOpportunities(),
    bookmakerService.list(),
    leagueService.list(),
    portfolioService.getStats(),
    settingsService.get(),
    portfolioService.listBets(),
  ]);

  const trackedBets: Record<string, TrackedBet> = {};
  for (const b of bets) {
    if (b.sourceOpportunityId && b.status === "pending") {
      trackedBets[b.sourceOpportunityId] = {
        stake: b.stake,
        odds: b.odds,
        auto: b.tags?.includes("auto-follow"),
      };
    }
  }

  const opportunities = all
    .map((o) => restrictOpportunityToBooks(o, settings.activeBookmakerIds))
    .filter((o): o is ValueOpportunity => o !== null)
    .filter((o) => o.expectedValue >= settings.minEdge)
    .sort((a, b) => b.edgePercent - a.edgePercent);

  return {
    opportunities,
    all,
    bookmakers,
    leagues,
    settings,
    bankroll: stats.bankroll,
    trackedBets,
  };
}
