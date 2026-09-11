import type { Confidence, MarketType, PriceMovement } from "./common";

/** A single price for a selection at one bookmaker. */
export interface OddsQuote {
  bookmakerId: string;
  /** Decimal odds. */
  price: number;
  updatedAt: string; // ISO
}

/**
 * A detected +EV football betting opportunity: the best available price for a
 * selection is higher than the de-vigged fair price derived from sharp books.
 */
export interface ValueOpportunity {
  id: string;
  leagueId: string;
  /** Denormalised league name, for convenience. */
  league: string;
  homeTeam: string;
  awayTeam: string;
  /** Last five results, most-recent last, e.g. "WWDLW". */
  homeForm: string;
  awayForm: string;

  /** Kick-off. */
  startsAt: string; // ISO

  market: MarketType;
  /** Human label, e.g. "Mål over/under 2.5". */
  marketLabel: string;
  /** The recommended selection, e.g. "Over 2.5". */
  selection: string;

  /** Highest decimal odds currently available. */
  bestOdds: number;
  bestBookmakerId: string;
  /** Unweighted market average of all quotes. */
  averageOdds: number;
  /** De-vigged fair odds derived from the sharp book. */
  fairOdds: number;
  /** 1 / fairOdds. */
  fairProbability: number;
  /** Best price at the moment the opportunity was first detected. */
  openingOdds: number;
  /** How the best price has moved since detection. */
  priceMovement: PriceMovement;

  /** Expected value as a fraction of stake, e.g. 0.074 = +7.4%. */
  expectedValue: number;
  /** expectedValue * 100, precomputed for display. */
  edgePercent: number;
  /** Full-Kelly stake as a fraction of bankroll. */
  kellyFraction: number;

  confidence: Confidence;
  /** Short, human-readable reasons the model flagged this. */
  signals: string[];

  /** Every price we saw for this selection. */
  quotes: OddsQuote[];
  /** How many bookmakers have priced this selection. */
  booksCount: number;

  detectedAt: string; // ISO
  read: boolean;
}

export interface ValueFilters {
  leagueIds?: string[];
  markets?: MarketType[];
  bookmakerIds?: string[];
  movement?: PriceMovement;
  /** Minimum edge as a fraction (0.03 = +3%). */
  minEdge?: number;
  /** Only show opportunities kicking off within N hours. */
  withinHours?: number;
  search?: string;
  sort?: ValueSort;
}

export type ValueSort =
  | "score-desc"
  | "edge-desc"
  | "kickoff-asc"
  | "odds-desc"
  | "detected-desc";
