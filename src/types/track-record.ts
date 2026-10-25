import type { Confidence, MarketType } from "./common";

export type PickResult = "won" | "lost" | "void" | "half-won" | "half-lost";

/** A value bet the AI posted that has since been graded. */
export interface SettledPick {
  id: string;
  postedAt: string; // ISO
  settledAt: string; // ISO

  leagueId: string;
  league: string;
  homeTeam: string;
  awayTeam: string;

  market: MarketType;
  marketLabel: string;
  selection: string;
  bookmakerId: string;

  /** Best odds at the moment the AI posted the pick. */
  postedOdds: number;
  /** Odds at kick-off — the honest benchmark. */
  closingOdds: number;
  /** (postedOdds / closingOdds − 1) × 100. Positive = we beat the close. */
  clvPercent: number;
  /** EV% the AI estimated when it posted. */
  edgePercent: number;

  /** Recommended stake in units (¼ Kelly, capped). */
  stakeUnits: number;
  result: PickResult;
  /** Settled P&L in units. */
  profitUnits: number;
  confidence: Confidence;
}

/** Headline numbers for "if you followed every AI value bet". */
export interface TrackRecordStats {
  picks: number;
  wonPicks: number;
  lostPicks: number;
  hitRate: number;

  stakedUnits: number;
  profitUnits: number;
  /** profitUnits / stakedUnits — the yield. */
  roi: number;
  avgOdds: number;
  /** Average EV% the AI claimed at post time. */
  avgEdge: number;
  /** Average realised CLV, as a fraction — the trust metric. */
  avgClv: number;
  /** Share of picks that beat the closing line. */
  clvBeatRate: number;

  since: string; // ISO date
  updatedAt: string; // ISO
  /** Picks saved but not yet graded (their match hasn't finished). */
  pendingPicks?: number;
}

export interface TrackRecordPoint {
  date: string; // ISO date
  cumulativeUnits: number;
  picks: number;
}

export type TrackBreakdownDimension = "market" | "league" | "edge" | "month";

export interface TrackBreakdownRow {
  key: string;
  label: string;
  picks: number;
  profitUnits: number;
  roi: number;
  hitRate: number;
  avgClv: number;
}

/** Historical performance for one market family — shown next to a live pick. */
export interface MarketPerformance {
  market: MarketType;
  picks: number;
  hitRate: number;
  roi: number;
  avgClv: number;
}
