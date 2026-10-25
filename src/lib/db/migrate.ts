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
  `CREATE TABLE IF NOT EXISTS niche_fixtures (
    fixture_id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    opps_json TEXT,
    fetched_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS player_names (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS team_players (
    team_id INTEGER NOT NULL,
    season INTEGER NOT NULL,
    players_json TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    PRIMARY KEY (team_id, season)
  )`,
  `CREATE TABLE IF NOT EXISTS track_picks (
    id TEXT PRIMARY KEY,
    league_id TEXT NOT NULL,
    league TEXT NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    market TEXT NOT NULL,
    market_label TEXT NOT NULL,
    selection TEXT NOT NULL,
    bookmaker_id TEXT NOT NULL,
    posted_odds REAL NOT NULL,
    closing_odds REAL NOT NULL,
    edge_percent REAL NOT NULL,
    confidence TEXT NOT NULL,
    grade_json TEXT NOT NULL,
    posted_at TEXT NOT NULL,
    status TEXT NOT NULL,
    settled_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS track_picks_status ON track_picks(status, starts_at)`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    href TEXT,
    created_at TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    dedupe_key TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe ON notifications(user_id, dedupe_key)`,
  `CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS notify_seen (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
  )`,
  `CREATE TABLE IF NOT EXISTS match_players (
    fixture_id INTEGER PRIMARY KEY,
    players_json TEXT NOT NULL,
    fetched_at TEXT NOT NULL
  )`,
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
const ADD_COLUMNS = [
  "ALTER TABLE users ADD COLUMN last_login_at TEXT",
  "ALTER TABLE niche_fixtures ADD COLUMN home_id INTEGER",
  "ALTER TABLE niche_fixtures ADD COLUMN away_id INTEGER",
];

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
