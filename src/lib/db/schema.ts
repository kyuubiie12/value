import { sqliteTable, text, real, integer, primaryKey } from "drizzle-orm/sqlite-core";
import type { UserSettings } from "@/types";

/**
 * SQLite schema (Drizzle). This is the persistence layer that turned ValueBet AI
 * from a single-user mock into a real multi-user app. Reference data
 * (leagues / bookmakers / value opportunities / track record) stays generated in
 * `src/lib/mock-data` — only per-user state lives here.
 *
 * DDL is applied by `migrate.ts` (plain `CREATE TABLE IF NOT EXISTS`), so keep
 * that file in sync when you change a table here.
 */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull(), // ISO
  /** Stamped on every login/signup — drives "sidst logget ind" in the admin overview. */
  lastLoginAt: text("last_login_at"), // ISO, null for accounts that predate the column
});

export const sessions = sqliteTable("sessions", {
  /** sha-256 of the opaque token held in the cookie. */
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at").notNull(), // epoch ms
  createdAt: integer("created_at").notNull(), // epoch ms
});

/**
 * One row per user. `data` holds the `UserSettings` fields the user can change
 * (feed/bankroll/theme/notifications). Identity fields (displayName, email,
 * memberSince, plan) are merged in from `users` at read time.
 */
export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  data: text("data", { mode: "json" }).notNull().$type<Partial<UserSettings>>(),
});

export const bets = sqliteTable("bets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  placedAt: text("placed_at").notNull(),
  settledAt: text("settled_at"),
  leagueId: text("league_id").notNull(),
  league: text("league").notNull(),
  event: text("event").notNull(),
  eventStartsAt: text("event_starts_at"),
  market: text("market").notNull(),
  marketLabel: text("market_label").notNull(),
  selection: text("selection").notNull(),
  bookmakerId: text("bookmaker_id").notNull(),
  odds: real("odds").notNull(),
  stake: real("stake").notNull(),
  stakeUnits: real("stake_units").notNull(),
  status: text("status").notNull(),
  payout: real("payout").notNull(),
  profit: real("profit").notNull(),
  closingOdds: real("closing_odds"),
  clvPercent: real("clv_percent"),
  expectedValue: real("expected_value"),
  notes: text("notes"),
  sourceOpportunityId: text("source_opportunity_id"),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
});

/** Opportunities the user removed after auto-follow logged them — never re-add. */
export const autoFollowDismissed = sqliteTable(
  "auto_follow_dismissed",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.opportunityId] })],
);

/** Per-user "read" state for the generated value feed. */
export const opportunityReads = sqliteTable(
  "opportunity_reads",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    opportunityId: text("opportunity_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.opportunityId] })],
);

/** Per-user "read" state for the generated notifications list. */
export const notificationReads = sqliteTable(
  "notification_reads",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notificationId: text("notification_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.notificationId] })],
);

/**
 * Login throttle. Persisted (not in-memory) because Vercel's serverless
 * runtime doesn't share process memory across concurrent/cold-started
 * invocations — an in-memory `Map` here would let attackers (or a confused
 * user retrying) blow past the limit simply by getting routed to a fresh
 * instance. Keyed by "<email>|<ip>"; one row per active 15-minute window,
 * pruned lazily by the code that reads it.
 */
export const loginAttempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  firstAt: integer("first_at").notNull(), // epoch ms
});

/** One row per browser/device that opted in to Web Push. */
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Push-service URL — unique per browser install. */
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: text("created_at").notNull(), // ISO
});

/**
 * Real-odds cache (API-Football). One row per upcoming fixture we price. The
 * free plan allows ~100 calls/day, so every user reads this table and a single
 * background refresh keeps it warm — never one API call per page view.
 * `odds_json` / `open_json` are `BookOdds` (book → bet id → value → decimal).
 */
export const oddsFixtures = sqliteTable("odds_fixtures", {
  fixtureId: integer("fixture_id").primaryKey(),
  leagueId: text("league_id").notNull(),
  startsAt: text("starts_at").notNull(), // ISO
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  /** Latest prices; null until the first odds call for this fixture. */
  oddsJson: text("odds_json"),
  /** Prices at first sight — the baseline for opening odds / price movement. */
  openJson: text("open_json"),
  /** The provider's own "odds last updated" stamp. */
  oddsUpdatedAt: text("odds_updated_at"),
  firstFetchedAt: text("first_fetched_at"),
  fetchedAt: text("fetched_at"),
});

/** Small key/value table for refresh bookkeeping (lock, quota, last list). */
export const feedMeta = sqliteTable("feed_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/**
 * Player-prop value (OddsPapi). One row per upcoming fixture; `oppsJson` holds
 * the already-detected opportunities, so the 1 MB odds payload is never stored.
 */
export const nicheFixtures = sqliteTable("niche_fixtures", {
  fixtureId: text("fixture_id").primaryKey(),
  leagueId: text("league_id").notNull(),
  startsAt: text("starts_at").notNull(), // ISO
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  oppsJson: text("opps_json"),
  fetchedAt: text("fetched_at"),
});

/** Player id → display name, so each player is looked up once. */
export const playerNames = sqliteTable("player_names", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type BetRow = typeof bets.$inferSelect;
