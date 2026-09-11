import type { BetStatus, MarketType } from "./common";

/** A football wager the user has logged to their tracker. */
export interface Bet {
  id: string;
  placedAt: string; // ISO
  settledAt?: string; // ISO

  leagueId: string;
  league: string;
  /** e.g. "Brøndby IF – FC København". */
  event: string;
  /** Kick-off of the underlying fixture — used to time open-bet settlement. */
  eventStartsAt?: string; // ISO
  market: MarketType;
  marketLabel: string;
  selection: string;

  bookmakerId: string;
  odds: number;
  /** Stake in the account currency. */
  stake: number;
  /** Stake expressed in units (stake / unitSize at time of placing). */
  stakeUnits: number;

  status: BetStatus;
  /** Total returned amount (0 when lost, stake × odds when won). */
  payout: number;
  /** payout − stake. */
  profit: number;

  /** Odds at kick-off, used for closing-line-value. */
  closingOdds?: number;
  /** (odds / closingOdds − 1) × 100. */
  clvPercent?: number;
  /** EV% logged at the time the bet was placed. */
  expectedValue?: number;

  notes?: string;
  /** Links back to the feed opportunity this bet came from. */
  sourceOpportunityId?: string;
  tags?: string[];
}

/** Payload for logging a new bet (id / derived fields computed by the service). */
export interface NewBetInput {
  placedAt?: string;
  leagueId: string;
  league: string;
  event: string;
  eventStartsAt?: string;
  market: MarketType;
  marketLabel: string;
  selection: string;
  bookmakerId: string;
  odds: number;
  stake: number;
  status?: BetStatus;
  expectedValue?: number;
  notes?: string;
  sourceOpportunityId?: string;
  tags?: string[];
}

export interface BetFilters {
  statuses?: BetStatus[];
  leagueIds?: string[];
  bookmakerIds?: string[];
  from?: string; // ISO date
  to?: string; // ISO date
  search?: string;
  sort?: BetSort;
}

export type BetSort =
  | "placed-desc"
  | "placed-asc"
  | "profit-desc"
  | "profit-asc"
  | "stake-desc"
  | "odds-desc";
