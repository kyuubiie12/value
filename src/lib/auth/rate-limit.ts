import "server-only";
import { eq } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { loginAttempts } from "@/lib/db/schema";

/**
 * Login throttle, persisted in the DB rather than in-memory — Vercel's
 * serverless runtime doesn't share process memory across concurrent or
 * cold-started invocations, so an in-memory `Map` here would effectively
 * never trigger in production (each attempt can land on a fresh instance
 * with an empty Map). Keyed by email+client so one attacker can't lock a
 * victim out by spamming their address from elsewhere.
 */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export interface ThrottleState {
  blocked: boolean;
  retryInMinutes: number;
}

export async function checkLoginThrottle(key: string): Promise<ThrottleState> {
  await dbReady;
  const row = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.key, key))
    .get();
  if (!row) return { blocked: false, retryInMinutes: 0 };

  if (Date.now() - row.firstAt > WINDOW_MS) {
    // Window expired — drop the stale row rather than leaving it to rot.
    await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
    return { blocked: false, retryInMinutes: 0 };
  }

  if (row.count >= MAX_ATTEMPTS) {
    return {
      blocked: true,
      retryInMinutes: Math.max(
        1,
        Math.ceil((row.firstAt + WINDOW_MS - Date.now()) / 60_000),
      ),
    };
  }
  return { blocked: false, retryInMinutes: 0 };
}

export async function recordLoginFailure(key: string): Promise<void> {
  await dbReady;
  const row = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.key, key))
    .get();

  if (!row || Date.now() - row.firstAt > WINDOW_MS) {
    // libSQL doesn't need a manual upsert dance for a fresh window: delete
    // any stale row first (no-op if none), then insert clean.
    await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
    await db.insert(loginAttempts).values({ key, count: 1, firstAt: Date.now() });
  } else {
    await db
      .update(loginAttempts)
      .set({ count: row.count + 1 })
      .where(eq(loginAttempts.key, key));
  }
}

export async function clearLoginThrottle(key: string): Promise<void> {
  await dbReady;
  await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
}
