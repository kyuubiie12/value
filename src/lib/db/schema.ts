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

export type UserRow = typeof users.$inferSelect;
export type BetRow = typeof bets.$inferSelect;
