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
/** One of a team's recent matches, seen from that team's side. */
export interface TeamFormMatch {
  date: string; // ISO
  /** Goals for / against. */
  gf: number;
  ga: number;
  home: boolean;
  opponent: string;
  /** Corners the team won / conceded in that match, when known. */
  cf?: number;
  ca?: number;
}

/** A cards / corners line on the match, a half or one team — how to look it up after the match. */
export interface StatSpec {
  category: "cards" | "corners";
  scope: "match" | "home" | "away";
  period: "ft" | "1h" | "2h";
  side: "over" | "under";
  line: number;
}

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
  /** De-vigged fair odds derived from the sharp book — or, for `consensus`, the other books' average price. */
  fairOdds: number;
  /**
   * What `fairOdds` is built from. `sharp` (default): Pinnacle without margin.
   * `consensus`: the average of the other bookmakers' prices — a price
   * disagreement, weaker than a sharp reference (used for player props).
   */
  fairBasis?: "sharp" | "consensus" | "history";
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
  /**
   * Structured backing data for counting-stat markets (corners, cards) —
   * the concrete numbers behind the line, not just prose. Undefined for
   * markets without a natural "average per game" stat (1x2, btts, …).
   */
  statContext?: MarketStatContext;

  /**
   * What the player has actually done this season (player props only): their
   * per-game rate for the stat and the chance that rate implies for this line.
   */
  playerStats?: PlayerStatContext;
  /** SportAPI/OddsPapi team ids — how a pick finds its finished match later. */
  teamIds?: { home: number; away: number };
  /** Both teams' recent matches (newest first) — the numbers behind a result/goals bet. */
  teamForm?: { home: TeamFormMatch[]; away: TeamFormMatch[] };
  /** Cards / corners lines (match, half, team): what to look up after the match to grade the pick. */
  statSpec?: StatSpec;
  /** Player props: is he in the starting eleven? "confirmed" = official line-up, "expected" = the predicted one. */
  lineup?: "confirmed" | "expected";
  /** Whole-match cards lines: the referee's own record, when it agrees with the line. */
  referee?: { name: string; perGame: number; games: number };
  /** Pinnacle has moved towards this outcome since we first saw the match, and the bookmaker has not followed. */
  sharpMove?: { fromOdds: number; toOdds: number };
  /** Player props only: what to look up after the match to grade the pick. */
  propSpec?: { player: string; stat: "shots" | "shots-on-target" | "tackles" | "fouls" | "saves" | "cards"; line: number; /** SportAPI player id, for the line-up check. */ playerId?: number };

  /** Every price we saw for this selection. */
  quotes: OddsQuote[];
  /** How many bookmakers have priced this selection. */
  booksCount: number;

  detectedAt: string; // ISO
  read: boolean;
}

/**
 * Per-fixture stats for a counting market: each team's own average for the
 * stat, the head-to-head average when these two teams have met, and the
 * line the opportunity is priced on — the numeric justification for the
 * pick, e.g. "AGF henter 4,6 hjørnespark hjemme, FCK afgiver 6,3 ude,
 * indbyrdes snit 11,2 over 4 kampe — linjen er 9.5."
 */
export interface MarketStatContext {
  /** e.g. "hjørnespark", "kort". */
  metric: string;
  /** Home team's own average for this stat in their matches. */
  homeAvg: number;
  /** Away team's own average for this stat in their matches. */
  awayAvg: number;
  /** Average combined total across their head-to-head meetings. */
  h2hAvg: number;
  /** Sample size behind h2hAvg. */
  h2hMatches: number;
  /** The over/under line this opportunity is priced on. */
  line: number;
}

/** A player's season record for the stat behind a prop, and what it implies. */
export interface PlayerStatContext {
  player: string;
  /** Season start year, e.g. 2026 = 2026/27. */
  season: number;
  /** Earliest season pooled into the rate (set when last season was added for a steadier sample). */
  fromSeason?: number;
  /** Stat label in Danish plural, e.g. "fouls". */
  metric: string;
  games: number;
  total: number;
  perGame: number;
  /** The bet needs at least this many (the "2+" in "2+ fouls"). */
  line: number;
  /** Chance of reaching the line if the player repeats his rate (Poisson). */
  modelProbability: number;
  modelFairOdds: number;
  /** His last matches, when the reasoning is built on them (player props). */
  history?: {
    /** The stat in each of his recent matches, most recent first. */
    counts: number[];
    /** Matches where he reached the line. */
    hits: number;
    n: number;
    hitRate: number;
    /** Chance from his average alone — a cross-check on the hit rate. */
    poisson: number;
  };
}

export interface ValueFilters {
  leagueIds?: string[];
  markets?: MarketType[];
  bookmakerIds?: string[];
  movement?: PriceMovement;
  /** Minimum edge as a fraction (0.03 = +3%). */
  minEdge?: number;
  /** Best-price range (decimal odds); omit a side for no limit. */
  minOdds?: number;
  maxOdds?: number;
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

/** Where the feed's odds come from, and how fresh they are. */
export interface FeedStatus {
  /** "live" = real bookmaker odds; "demo" = the generated sample feed. */
  source: "live" | "demo";
  /** ISO of the latest odds fetch (live only). */
  updatedAt: string | null;
  /** Upcoming matches we hold prices for. */
  pricedFixtures: number;
  /** A refresh is running right now. */
  refreshing: boolean;
  /** The provider's daily quota is used up — odds stay as-is until tomorrow. */
  quotaSpent: boolean;
}
