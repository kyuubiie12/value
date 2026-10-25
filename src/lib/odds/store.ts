import "server-only";
import { eq, gt, lt, sql } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { feedMeta, nicheFixtures, oddsFixtures } from "@/lib/db/schema";
import { horizonMs, LEAGUE_PRIORITY, MAX_HORIZON_MS } from "./config";
import { loadMarketDicts } from "./market-dicts";
import { fetchFixtureNicheOdds, OddsPapiError, oddsPapiConfigured } from "./oddspapi";
import { ensureNicheFixtures } from "./niche-store";
import { toBookOdds, type RawMainOdds } from "./oddspapi-main";
import { fixtureForm } from "./team-form";
import type { BookOdds, FixtureRecord } from "./detect";

/**
 * Database-backed odds cache + the refresh job for the main markets. Everything
 * comes from OddsPapi: its fixture list defines which matches we follow, and one
 * call per match returns every Danish book next to Pinnacle. One shared snapshot
 * serves every user; a DB lock stops concurrent page loads double-spending.
 */

/** Re-price a fixture once its odds are this old. */
const STALE_MS = 8 * 3_600_000;
/** At most this many matches are followed at once (best leagues, soonest first). */
const UNIVERSE = Number(process.env.ODDS_UNIVERSE) || 45;
/** Odds calls per run — keeps a run inside the function time limit. */
const MAX_PER_RUN = 24;
/** Keep this many OddsPapi calls in hand for the player-props feed. */
const PAPI_RESERVE = 200;
const LOCK_MS = 4 * 60_000;
/** OddsPapi's fixture ids are "id" + a number; the number is our fixture id. */
const LEGACY_ID_LIMIT = 1_000_000_000_000;

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

function parseForm(json: string | null): FixtureRecord["form"] {
  if (!json) return null;
  try {
    return JSON.parse(json) as FixtureRecord["form"];
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
    if (!odds || !r.fetchedAt || r.fixtureId < LEGACY_ID_LIMIT) continue;
    out.push({
      fixtureId: r.fixtureId,
      leagueId: r.leagueId,
      startsAt: r.startsAt,
      homeTeam: r.homeTeam,
      awayTeam: r.awayTeam,
      odds,
      openOdds: parse(r.openJson),
      form: parseForm(r.formJson),
      homeId: r.homeId,
      awayId: r.awayId,
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
    quotaSpent: Number(meta.niche_blocked_until ?? 0) > now,
  };
}

type FixtureRow = typeof oddsFixtures.$inferSelect;

/** OddsPapi's "id1000001772221346" ↔ the number we store. */
const toFixtureId = (papiId: string) => Number(papiId.replace(/^id/, ""));
const toPapiId = (fixtureId: number) => `id${fixtureId}`;

/**
 * Follow the matches OddsPapi lists: one row per upcoming match within the
 * horizon. (Rows from the old fixture source are dropped.)
 */
async function syncFixtures(now: number) {
  await db.delete(oddsFixtures).where(lt(oddsFixtures.fixtureId, LEGACY_ID_LIMIT));
  await db.delete(oddsFixtures).where(lt(oddsFixtures.startsAt, new Date(now - 3_600_000).toISOString()));
  const listed = await db
    .select()
    .from(nicheFixtures)
    .where(
      sql`${nicheFixtures.startsAt} > ${new Date(now).toISOString()}
        and ${nicheFixtures.startsAt} < ${new Date(now + MAX_HORIZON_MS).toISOString()}`,
    )
    .all();
  for (const r of listed) {
    if (new Date(r.startsAt).getTime() > now + horizonMs(r.leagueId)) continue;
    const fixtureId = toFixtureId(r.fixtureId);
    if (!Number.isFinite(fixtureId)) continue;
    await db
      .insert(oddsFixtures)
      .values({
        fixtureId,
        leagueId: r.leagueId,
        startsAt: r.startsAt,
        homeTeam: r.homeTeam,
        awayTeam: r.awayTeam,
        homeId: r.homeId,
        awayId: r.awayId,
      })
      .onConflictDoUpdate({
        target: oddsFixtures.fixtureId,
        set: {
          startsAt: r.startsAt,
          homeTeam: r.homeTeam,
          awayTeam: r.awayTeam,
          homeId: r.homeId,
          awayId: r.awayId,
        },
      });
  }
}

/**
 * The matches worth pricing right now: the best-ranked `UNIVERSE` upcoming
 * ones, of which those with missing or old prices are due.
 */
async function pickDue(now: number): Promise<FixtureRow[]> {
  const upcoming = (await db
    .select()
    .from(oddsFixtures)
    .where(
      sql`${oddsFixtures.startsAt} > ${new Date(now).toISOString()}
        and ${oddsFixtures.startsAt} < ${new Date(now + MAX_HORIZON_MS).toISOString()}
        and ${oddsFixtures.fixtureId} >= ${LEGACY_ID_LIMIT}`,
    )
    .all()).filter((f) => new Date(f.startsAt).getTime() <= now + horizonMs(f.leagueId));
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
  if (!oddsPapiConfigured()) return false;
  if (needsCache && Date.now() - needsCache.at < NEEDS_TTL_MS) return needsCache.value;
  await dbReady;
  const now = Date.now();
  const meta = await getAllMeta();
  let value: boolean;
  if (Number(meta.niche_blocked_until ?? 0) > now || Number(meta.refresh_lock ?? 0) > now) value = false;
  else if (meta.niche_ids_v !== "2") value = true; // OddsPapi fixture list not built yet
  else {
    const within = (r: { leagueId: string; startsAt: string }) =>
      new Date(r.startsAt).getTime() <= now + horizonMs(r.leagueId);
    const [listedRows, followedRows] = await Promise.all([
      db
        .select({ leagueId: nicheFixtures.leagueId, startsAt: nicheFixtures.startsAt })
        .from(nicheFixtures)
        .where(sql`${nicheFixtures.startsAt} > ${new Date(now).toISOString()} and ${nicheFixtures.startsAt} < ${new Date(now + MAX_HORIZON_MS).toISOString()}`)
        .all(),
      db
        .select({ n: sql<number>`count(*)` })
        .from(oddsFixtures)
        .where(sql`${oddsFixtures.startsAt} > ${new Date(now).toISOString()} and ${oddsFixtures.fixtureId} >= ${LEGACY_ID_LIMIT}`)
        .get(),
    ]);
    const listed = { n: listedRows.filter(within).length };
    const followed = followedRows;
    value = (listed?.n ?? 0) > (followed?.n ?? 0) || (await pickDue(now)).length > 0;
  }
  needsCache = { at: now, value };
  return value;
}

/**
 * Refresh the cache: make sure the match list is current, then price the stalest
 * matches. Safe to call from several requests at once — only one holds the lock.
 */
export async function refreshOdds(): Promise<{ priced: number; skipped?: string }> {
  await dbReady;
  if (!oddsPapiConfigured()) return { priced: 0, skipped: "no-key" };
  const now = Date.now();
  if (Number((await getMeta("niche_blocked_until")) ?? 0) > now) return { priced: 0, skipped: "quota" };
  if (Number((await getMeta("refresh_lock")) ?? 0) > now) return { priced: 0, skipped: "locked" };
  await setMeta("refresh_lock", String(now + LOCK_MS));

  let priced = 0;
  try {
    // OddsPapi's own fixture list defines what we follow (and carries the team ids).
    await ensureNicheFixtures().catch((err) => console.error("[odds] OddsPapi list failed:", err));
    await syncFixtures(now);

    const due = await pickDue(now);
    const dicts = due.length ? await loadMarketDicts() : null;

    for (const f of due.slice(0, MAX_PER_RUN)) {
      if (Number((await getMeta("niche_remaining")) || Infinity) <= PAPI_RESERVE) break;
      try {
        const raw = await fetchFixtureNicheOdds(toPapiId(f.fixtureId));
        if (raw.remaining !== null) await setMeta("niche_remaining", String(raw.remaining));
        const odds = toBookOdds(raw.odds as RawMainOdds, dicts!.main);
        const fetchedAt = new Date().toISOString();
        const json = JSON.stringify(odds);
        await db
          .update(oddsFixtures)
          .set({
            oddsJson: json,
            openJson: f.openJson ?? json,
            oddsUpdatedAt: fetchedAt,
            firstFetchedAt: f.firstFetchedAt ?? fetchedAt,
            fetchedAt,
            source: "papi",
          })
          .where(eq(oddsFixtures.fixtureId, f.fixtureId));
        priced++;
        const form = await fixtureForm(f.homeId, f.awayId);
        if (form) await db.update(oddsFixtures).set({ formJson: JSON.stringify(form) }).where(eq(oddsFixtures.fixtureId, f.fixtureId));
      } catch (err) {
        if (err instanceof OddsPapiError && err.quotaSpent) {
          // Re-check in 12 h: the allowance either reset or we keep waiting.
          await setMeta("niche_blocked_until", String(Date.now() + 12 * 3_600_000));
          break;
        }
        console.error("[odds] could not price a match:", err);
      }
    }

    // Matches priced before form existed get it too (SportAPI only, cached).
    const missing = await db
      .select()
      .from(oddsFixtures)
      .where(sql`(${oddsFixtures.formJson} is null or ${oddsFixtures.formJson} not like '%"cf"%') and ${oddsFixtures.oddsJson} is not null and ${oddsFixtures.startsAt} > ${new Date().toISOString()}`)
      .limit(6)
      .all();
    for (const f of missing) {
      const form = await fixtureForm(f.homeId, f.awayId);
      if (form) await db.update(oddsFixtures).set({ formJson: JSON.stringify(form) }).where(eq(oddsFixtures.fixtureId, f.fixtureId));
    }
    return { priced };
  } catch (err) {
    console.error("[odds] refresh failed:", err);
    return { priced };
  } finally {
    needsCache = null;
    await setMeta("refresh_lock", "0");
  }
}
