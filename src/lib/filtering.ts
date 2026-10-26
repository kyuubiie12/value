import type {
  Bet,
  BetFilters,
  ValueFilters,
  ValueOpportunity,
} from "@/types";
import { valueScore } from "./value-score";

/** Without a chosen odds range the feed stops here; asking for odds from HIGH_ODDS_FROM up lifts the ceiling. */
export const DEFAULT_ODDS_CEILING = 5.5;
export const HIGH_ODDS_FROM = 5;

/** Does a best price fit the user's odds preference (0 = no limit on that side)? */
export function oddsAllowed(odds: number, min = 0, max = 0): boolean {
  if (min && odds < min) return false;
  if (max) return odds <= max;
  return min >= HIGH_ODDS_FROM || odds <= DEFAULT_ODDS_CEILING;
}

/** Pure, shared filtering + sorting for value opportunities. */
export function filterOpportunities(
  items: ValueOpportunity[],
  filters: ValueFilters = {},
): ValueOpportunity[] {
  let result = [...items];

  if (filters.leagueIds?.length)
    result = result.filter((o) => filters.leagueIds!.includes(o.leagueId));
  if (filters.markets?.length)
    result = result.filter((o) => filters.markets!.includes(o.market));
  if (filters.bookmakerIds?.length)
    result = result.filter((o) =>
      o.quotes.some((q) => filters.bookmakerIds!.includes(q.bookmakerId)),
    );
  if (filters.movement)
    result = result.filter((o) => o.priceMovement === filters.movement);
  if (typeof filters.minEdge === "number")
    result = result.filter((o) => o.expectedValue >= filters.minEdge!);
  result = result.filter((o) => oddsAllowed(o.bestOdds, filters.minOdds, filters.maxOdds));
  if (typeof filters.withinHours === "number") {
    const cutoff = Date.now() + filters.withinHours * 3_600_000;
    result = result.filter((o) => new Date(o.startsAt).getTime() <= cutoff);
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter((o) =>
      `${o.homeTeam} ${o.awayTeam} ${o.league} ${o.selection}`
        .toLowerCase()
        .includes(q),
    );
  }

  switch (filters.sort ?? "score-desc") {
    case "edge-desc":
      result.sort((a, b) => b.edgePercent - a.edgePercent);
      break;
    case "kickoff-asc":
      result.sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
      break;
    case "odds-desc":
      result.sort((a, b) => b.bestOdds - a.bestOdds);
      break;
    case "detected-desc":
      result.sort((a, b) => +new Date(b.detectedAt) - +new Date(a.detectedAt));
      break;
    default:
      // Value score: edge weighted by confidence + a sharp-confirmed move.
      result.sort((a, b) => valueScore(b) - valueScore(a));
  }
  return result;
}

/** Pure, shared filtering + sorting for logged bets. */
export function filterBets(bets: Bet[], filters: BetFilters = {}): Bet[] {
  let result = [...bets];

  if (filters.statuses?.length)
    result = result.filter((b) => filters.statuses!.includes(b.status));
  if (filters.leagueIds?.length)
    result = result.filter((b) => filters.leagueIds!.includes(b.leagueId));
  if (filters.bookmakerIds?.length)
    result = result.filter((b) => filters.bookmakerIds!.includes(b.bookmakerId));
  if (filters.from) result = result.filter((b) => b.placedAt >= filters.from!);
  if (filters.to) result = result.filter((b) => b.placedAt <= filters.to!);
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter((b) =>
      `${b.event} ${b.league} ${b.selection} ${b.marketLabel}`
        .toLowerCase()
        .includes(q),
    );
  }

  switch (filters.sort ?? "placed-desc") {
    case "placed-asc":
      result.sort((a, b) => +new Date(a.placedAt) - +new Date(b.placedAt));
      break;
    case "profit-desc":
      result.sort((a, b) => b.profit - a.profit);
      break;
    case "profit-asc":
      result.sort((a, b) => a.profit - b.profit);
      break;
    case "stake-desc":
      result.sort((a, b) => b.stake - a.stake);
      break;
    case "odds-desc":
      result.sort((a, b) => b.odds - a.odds);
      break;
    default:
      result.sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt));
  }
  return result;
}
