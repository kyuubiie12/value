import "server-only";
import { eq, gt, lt, sql } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { feedMeta, oddsFixtures } from "@/lib/db/schema";
import {
  ApiFootballError,
  fetchFixtureOdds,
  listFixtures,
} from "./api-football";
import { LEAGUE_PRIORITY } from "./config";
import type { BookOdds, FixtureRecord } from "./detect";

/**
 * Database-backed odds cache + the refresh job. Free plan = ~100 calls/day and
 * 10/min, so: one shared snapshot for every user, fixtures priced a few at a
 * time (stalest first), a DB lock so concurrent page loads don't double-spend,
 * and a hard stop when the provider says the quota is gone.
 */

/** Re-price a fixture once its odds are this old. */
const STALE_MS = 8 * 3_600_000;
/** Re-list fixtures (1 call per day-window) this often. */
const LIST_EVERY_MS = 12 * 3_600_000;
/** Only price matches kicking off within this horizon. */
const HORIZON_MS = 40 * 3_600_000;
/**
 * At most this many matches are tracked at once (best leagues, soonest first).
 * 30 matches × 3 refreshes a day fits the free plan's 100 calls with headroom.
 */
const UNIVERSE = 30;
/** Odds calls per run — keeps a run inside the function time limit. */
const MAX_PER_RUN = 12;
/** Provider allows 10/min; stay just under. */
const PACE_MS = 6_500;
/** Never spend the last few calls of the day. */
const KEEP_SPARE = 8;
const LOCK_MS = 4 * 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getMeta(key: string): Promise<string | null> {
  const row = await db.select().from(feedMeta).where(eq(feedMeta.key, key)).get();
  return row?.value ?? null;
}

async function setMeta(key: string, value: string) {
  await db
    .insert(feedMeta)
    .values({ key, value })
    .onConflictDoUpdate({ target: feedMeta.key, set: { value } });
}

async function getAllMeta(): Promise<Record<string, string>> {
  const rows = await db.select().from(feedMeta).all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function parse(json: string | null): BookOdds | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as BookOdds;
  } catch {
    return null;
  }
}

/** Priced, upcoming fixtures — what the feed is built from. */
export async function loadPricedFixtures(): Promise<FixtureRecord[]> {
  await dbReady;
  const rows = await db
    .select()
    .from(oddsFixtures)
    .where(gt(oddsFixtures.startsAt, new Date().toISOString()))
    .all();
  const out: FixtureRecord[] = [];
  for (const r of rows) {
    const odds = parse(r.oddsJson);
    if (!odds || !r.fetchedAt) continue;
    out.push({
      fixtureId: r.fixtureId,
      leagueId: r.leagueId,
      startsAt: r.startsAt,
      homeTeam: r.homeTeam,
      awayTeam: r.awayTeam,
      odds,
      openOdds: parse(r.openJson),
      oddsUpdatedAt: r.oddsUpdatedAt,
      firstFetchedAt: r.firstFetchedAt,
      fetchedAt: r.fetchedAt,
    });
  }
  return out;
}

export interface FeedStatus {
  /** ISO of the most recent odds fetch, null if nothing is priced yet. */
  updatedAt: string | null;
  pricedFixtures: number;
  refreshing: boolean;
  quotaSpent: boolean;
}

export async function feedStatus(): Promise<FeedStatus> {
  await dbReady;
  const now = Date.now();
  const [latest, count, meta] = await Promise.all([
    db
      .select({ at: sql<string | null>`max(${oddsFixtures.fetchedAt})` })
      .from(oddsFixtures)
      .get(),
    db
      .select({ n: sql<number>`count(*)` })
      .from(oddsFixtures)
      .where(
        sql`${oddsFixtures.startsAt} > ${new Date(now).toISOString()} and ${oddsFixtures.fetchedAt} is not null`,
      )
      .get(),
    getAllMeta(),
  ]);
  return {
    updatedAt: latest?.at ?? null,
    pricedFixtures: count?.n ?? 0,
    refreshing: Number(meta.refresh_lock ?? 0) > now,
    quotaSpent: Number(meta.blocked_until ?? 0) > now,
  };
}

type FixtureRow = typeof oddsFixtures.$inferSelect;

/**
 * The matches worth pricing right now: the best-ranked `UNIVERSE` upcoming
 * ones, of which those with missing or old prices are due.
 */
async function pickDue(now: number): Promise<FixtureRow[]> {
  const upcoming = await db
    .select()
    .from(oddsFixtures)
    .where(
      sql`${oddsFixtures.startsAt} > ${new Date(now).toISOString()}
        and ${oddsFixtures.startsAt} < ${new Date(now + HORIZON_MS).toISOString()}`,
    )
    .all();
  const rank = (f: FixtureRow) => [LEAGUE_PRIORITY[f.leagueId] ?? 9, f.startsAt] as const;
  upcoming.sort((a, b) => {
    const [pa, ta] = rank(a);
    const [pb, tb] = rank(b);
    return pa - pb || ta.localeCompare(tb);
  });
  const cutoff = new Date(now - STALE_MS).toISOString();
  const due = upcoming
    .slice(0, UNIVERSE)
    .filter((f) => f.fetchedAt === null || f.fetchedAt < cutoff);
  // Unpriced first, then soonest — a tight budget buys the most useful matches.
  due.sort(
    (a, b) =>
      Number(a.fetchedAt !== null) - Number(b.fetchedAt !== null) ||
      a.startsAt.localeCompare(b.startsAt),
  );
  return due;
}

let needsCache: { at: number; value: boolean } | null = null;
const NEEDS_TTL_MS = 30_000;

/** True when a refresh would do something — cheap check used before scheduling one. */
export async function needsRefresh(): Promise<boolean> {
  // Every page view asks; answer from memory for a few seconds instead of 4+ round trips.
  if (needsCache && Date.now() - needsCache.at < NEEDS_TTL_MS) return needsCache.value;
  await dbReady;
  const now = Date.now();
  const meta = await getAllMeta();
  let value: boolean;
  if (Number(meta.blocked_until ?? 0) > now || Number(meta.refresh_lock ?? 0) > now) value = false;
  else if (now - Number(meta.listed_at ?? 0) > LIST_EVERY_MS) value = true;
  else value = (await pickDue(now)).length > 0;
  needsCache = { at: now, value };
  return value;
}

const utcDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function nextUtcMidnight(now: number) {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

async function relist(now: number) {
  // The free plan only serves a window around today; today + tomorrow is what we need.
  for (const date of [utcDate(now), utcDate(now + 24 * 3_600_000)]) {
    const { fixtures } = await listFixtures(date);
    for (const f of fixtures) {
      await db
        .insert(oddsFixtures)
        .values({ ...f })
        .onConflictDoUpdate({
          target: oddsFixtures.fixtureId,
          set: {
            startsAt: f.startsAt,
            homeTeam: f.homeTeam,
            awayTeam: f.awayTeam,
          },
        });
    }
    await sleep(PACE_MS);
  }
  await setMeta("listed_at", String(now));
}

/**
 * Refresh the cache: re-list fixtures when due, then price the stalest ones.
 * Safe to call from several requests at once — only one holds the lock.
 */
export async function refreshOdds(): Promise<{ priced: number; skipped?: string }> {
  await dbReady;
  const now = Date.now();
  if (Number((await getMeta("blocked_until")) ?? 0) > now) return { priced: 0, skipped: "quota" };
  if (Number((await getMeta("refresh_lock")) ?? 0) > now) return { priced: 0, skipped: "locked" };
  await setMeta("refresh_lock", String(now + LOCK_MS));

  let priced = 0;
  try {
    // Drop matches that have kicked off.
    await db.delete(oddsFixtures).where(lt(oddsFixtures.startsAt, new Date(now - 3_600_000).toISOString()));

    if (now - Number((await getMeta("listed_at")) ?? 0) > LIST_EVERY_MS) await relist(now);

    const due = await pickDue(now);

    for (const f of due.slice(0, MAX_PER_RUN)) {
      const { odds, updatedAt, remaining } = await fetchFixtureOdds(f.fixtureId);
      const fetchedAt = new Date().toISOString();
      const json = JSON.stringify(odds);
      await db
        .update(oddsFixtures)
        .set({
          oddsJson: json,
          openJson: f.openJson ?? json,
          oddsUpdatedAt: updatedAt,
          firstFetchedAt: f.firstFetchedAt ?? fetchedAt,
          fetchedAt,
        })
        .where(eq(oddsFixtures.fixtureId, f.fixtureId));
      priced++;
      if (remaining !== null) {
        await setMeta("api_remaining", String(remaining));
        if (remaining <= KEEP_SPARE) {
          await setMeta("blocked_until", String(nextUtcMidnight(Date.now())));
          break;
        }
      }
      await sleep(PACE_MS);
    }
    return { priced };
  } catch (err) {
    if (err instanceof ApiFootballError && err.quotaSpent) {
      await setMeta("blocked_until", String(nextUtcMidnight(Date.now())));
    } else {
      console.error("[odds] refresh failed:", err);
    }
    return { priced };
  } finally {
    needsCache = null;
    await setMeta("refresh_lock", "0");
  }
}

