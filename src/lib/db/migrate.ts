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
    created_at TEXT NOT NULL
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
];

let done: Promise<void> | null = null;

export function runMigrations(client: Client): Promise<void> {
  if (!done) {
    done = (async () => {
      for (const sql of STATEMENTS) {
        await client.execute(sql);
      }
    })();
  }
  return done;
}
