import { createDbValueService } from "./db/value-service";
import { createOddsValueService } from "./odds/value-service";
import { createDbPortfolioService } from "./db/portfolio-service";
import { createDbSettingsService } from "./db/settings-service";
import { createDbNotificationService } from "./db/notification-service";
import { createRealNotificationService } from "./db/real-notification-service";
import { createMockBookmakerService } from "./mock/bookmaker-service";
import { createMockLeagueService } from "./mock/league-service";
import { createMockTrackRecordService } from "./mock/track-record-service";
import { createDbTrackRecordService } from "./db/track-record-service";
import { createMockInsightService } from "./mock/insight-service";
import { createOpenAiInsightService } from "./openai/insight-service";
import type {
  BookmakerService,
  InsightService,
  LeagueService,
  NotificationService,
  PortfolioService,
  SettingsService,
  TrackRecordService,
  ValueService,
} from "./types";

/**
 * Composition root for the data layer.
 *
 * Per-user state (portfolio, settings, notifications, feed read-state) is backed
 * by SQLite — those services read the current session internally and are only
 * safe to call from a signed-in request (a gated page or Server Action).
 * Reference data (leagues / bookmakers / value opportunities / track record) is
 * still generated in `src/lib/mock-data`. Swapping in a real odds/AI backend
 * later means changing only the factory calls below.
 */
/** Real odds (OddsPapi) when its key is set, else the generated demo feed. */
export const valueService: ValueService = process.env.RAPIDAPI_ODDSPAPI_KEY
  ? createOddsValueService()
  : createDbValueService();
export const portfolioService: PortfolioService = createDbPortfolioService();
export const bookmakerService: BookmakerService = createMockBookmakerService();
export const leagueService: LeagueService = createMockLeagueService();
export const settingsService: SettingsService = createDbSettingsService();
/** Real notifications from the background job when live odds are on; demo ones otherwise. */
export const notificationService: NotificationService = process.env.RAPIDAPI_ODDSPAPI_KEY
  ? createRealNotificationService()
  : createDbNotificationService();
/** With live odds the track record is real (graded from match results); otherwise demo data. */
export const trackRecordService: TrackRecordService = process.env.RAPIDAPI_ODDSPAPI_KEY
  ? createDbTrackRecordService()
  : createMockTrackRecordService();

/** Uses OpenAI when OPENAI_API_KEY is set, else the built-in fallback text. */
export const insightService: InsightService = process.env.OPENAI_API_KEY
  ? createOpenAiInsightService()
  : createMockInsightService();

export type {
  ValueService,
  PortfolioService,
  BookmakerService,
  LeagueService,
  SettingsService,
  NotificationService,
  TrackRecordService,
  InsightService,
  OpportunityInsight,
} from "./types";
