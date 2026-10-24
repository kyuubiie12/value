import type {
  AppNotification,
  Bet,
  BetFilters,
  Bookmaker,
  BreakdownDimension,
  DateRange,
  EquityPoint,
  League,
  MarketPerformance,
  MarketType,
  NewBetInput,
  PerformanceBreakdown,
  PortfolioStats,
  SettledPick,
  TrackBreakdownDimension,
  TrackBreakdownRow,
  TrackRecordPoint,
  TrackRecordStats,
  UserSettings,
  FeedStatus,
  ValueFilters,
  ValueOpportunity,
} from "@/types";

/**
 * Data-layer contracts. Every page and component depends only on these
 * interfaces — never on the mock implementation directly. To go live, drop in
 * an implementation backed by real APIs (odds provider, AI model, database) and
 * swap the singletons in `services/index.ts`. Nothing else changes.
 */

export interface ValueService {
  listOpportunities(filters?: ValueFilters): Promise<ValueOpportunity[]>;
  getOpportunity(id: string): Promise<ValueOpportunity | null>;
  /** Unread value alerts — powers the topbar badge. */
  getUnreadCount(): Promise<number>;
  markRead(id: string): Promise<void>;
  /** Source + freshness of the odds behind the feed. */
  getFeedStatus(): Promise<FeedStatus>;
}

export interface PortfolioService {
  getStats(): Promise<PortfolioStats>;
  getEquityCurve(range?: DateRange): Promise<EquityPoint[]>;
  listBets(filters?: BetFilters): Promise<Bet[]>;
  getBet(id: string): Promise<Bet | null>;
  addBet(input: NewBetInput): Promise<Bet>;
  updateBet(id: string, patch: Partial<Bet>): Promise<Bet>;
  /** Remove a logged bet (used when the user un-ticks "jeg spiller med"). */
  removeBet(id: string): Promise<void>;
  /** Opportunity ids the user removed after auto-follow logged them — don't re-add. */
  listAutoFollowDismissed(): Promise<string[]>;
  getBreakdown(dimension: BreakdownDimension): Promise<PerformanceBreakdown[]>;
}

export interface BookmakerService {
  list(): Promise<Bookmaker[]>;
  get(id: string): Promise<Bookmaker | null>;
}

export interface LeagueService {
  list(): Promise<League[]>;
  get(id: string): Promise<League | null>;
}

export interface SettingsService {
  get(): Promise<UserSettings>;
  update(patch: Partial<UserSettings>): Promise<UserSettings>;
}

export interface NotificationService {
  list(): Promise<AppNotification[]>;
  unreadCount(): Promise<number>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface TrackRecordFilters {
  markets?: MarketType[];
  leagueIds?: string[];
  result?: "won" | "lost";
  from?: string;
  to?: string;
}

export interface TrackRecordService {
  getStats(): Promise<TrackRecordStats>;
  getEquityCurve(): Promise<TrackRecordPoint[]>;
  listPicks(filters?: TrackRecordFilters): Promise<SettledPick[]>;
  getBreakdown(dimension: TrackBreakdownDimension): Promise<TrackBreakdownRow[]>;
  getMarketPerformance(market: MarketType): Promise<MarketPerformance>;
}

export interface OpportunityInsight {
  /** 3–4 short, grounded rationale bullets (Danish). */
  signals: string[];
  /** One or two sentences of plain-language take. */
  summary: string;
  /** How the insight was produced. */
  source: "ai" | "fallback";
}

export interface InsightService {
  /** Deep analysis for one value opportunity — used by the drawer. */
  analyse(opportunity: ValueOpportunity): Promise<OpportunityInsight>;
}
