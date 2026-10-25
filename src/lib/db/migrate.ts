import "server-only";
import type { Client } from "@libsql/client";

/**
 * Hand-written DDL, applied once per process. We deliberately avoid drizzle-kit's
 * migration runner at runtime (it pulls in esbuild) — `CREATE TABLE IF NOT
 * EXISTS` is enough for SQLite and this app's needs. Keep in sync with
 * `schema.ts`.
 */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    placed_at TEXT NOT NULL,
    settled_at TEXT,
    league_id TEXT NOT NULL,
    league TEXT NOT NULL,
    event TEXT NOT NULL,
    event_starts_at TEXT,
    market TEXT NOT NULL,
    market_label TEXT NOT NULL,
    selection TEXT NOT NULL,
    bookmaker_id TEXT NOT NULL,
    odds REAL NOT NULL,
    stake REAL NOT NULL,
    stake_units REAL NOT NULL,
    status TEXT NOT NULL,
    payout REAL NOT NULL,
    profit REAL NOT NULL,
    closing_odds REAL,
    clv_percent REAL,
    expected_value REAL,
    notes TEXT,
    source_opportunity_id TEXT,
    tags TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS bets_user_id ON bets(user_id)`,
  `CREATE TABLE IF NOT EXISTS auto_follow_dismissed (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opportunity_id TEXT NOT NULL,
    PRIMARY KEY (user_id, opportunity_id)
  )`,
  `CREATE TABLE IF NOT EXISTS opportunity_reads (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opportunity_id TEXT NOT NULL,
    PRIMARY KEY (user_id, opportunity_id)
  )`,
  `CREATE TABLE IF NOT EXISTS notification_reads (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id TEXT NOT NULL,
    PRIMARY KEY (user_id, notification_id)
  )`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS push_subscriptions_user_id ON push_subscriptions(user_id)`,
  `CREATE TABLE IF NOT EXISTS odds_fixtures (
    fixture_id INTEGER PRIMARY KEY,
    league_id TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    odds_json TEXT,
    open_json TEXT,
    odds_updated_at TEXT,
    first_fetched_at TEXT,
    fetched_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS odds_fixtures_starts_at ON odds_fixtures(starts_at)`,
  `CREATE TABLE IF NOT EXISTS feed_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    first_at INTEGER NOT NULL
  )`,
];

/**
 * Columns added after a table first shipped. `CREATE TABLE IF NOT EXISTS` won’t
 * touch an existing table, so these are applied one by one and a "duplicate
 * column" error (fresh DBs already have it) is expected and ignored.
 */
const ADD_COLUMNS = ["ALTER TABLE users ADD COLUMN last_login_at TEXT"];

let done: Promise<void> | null = null;

export function runMigrations(client: Client): Promise<void> {
  if (!done) {
    done = (async () => {
      // One round trip for every CREATE (the database can be an ocean away), then
      // the column additions together — instead of ~30 sequential statements
      // on every cold start.
      await client.batch(STATEMENTS, "write");
      await Promise.all(
        ADD_COLUMNS.map(async (sql) => {
          try {
            await client.execute(sql);
          } catch (err) {
            if (!/duplicate column/i.test(String(err))) throw err;
          }
        }),
      );
    })();
  }
  return done;
}
