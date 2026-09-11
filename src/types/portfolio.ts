import type { Currency } from "./common";

/** Headline numbers for the tracker dashboard. */
export interface PortfolioStats {
  currency: Currency;
  startingBankroll: number;
  bankroll: number;

  totalStaked: number;
  totalProfit: number;
  /** totalProfit / totalStaked. */
  roi: number;
  /** Realised profit only (settled bets). */
  realisedProfit: number;
  /** Stake currently tied up in open bets. */
  pendingStake: number;

  /** wonBets / settledBets. */
  hitRate: number;
  avgOdds: number;
  avgStake: number;

  betCount: number;
  openBets: number;
  settledBets: number;
  wonBets: number;
  lostBets: number;

  /** Average closing-line value across settled bets, as a fraction. */
  avgClv: number;
  currentStreak: { type: "win" | "loss"; count: number };

  updatedAt: string; // ISO
}

/** One point on the accumulated-profit chart. */
export interface EquityPoint {
  date: string; // ISO date
  bankroll: number;
  cumulativeProfit: number;
  stakedToDate: number;
  betsToDate: number;
}

export type BreakdownDimension = "league" | "bookmaker" | "market" | "month";

/** Performance sliced by one dimension (league, book, market …). */
export interface PerformanceBreakdown {
  key: string;
  label: string;
  bets: number;
  staked: number;
  profit: number;
  roi: number;
  hitRate: number;
}
