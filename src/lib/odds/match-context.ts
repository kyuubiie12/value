import "server-only";
import { and, gt, isNotNull, lt, ne, sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { feedMeta, nicheFixtures } from "@/lib/db/schema";
import {
  eventLineup,
  eventReferee,
  sportApiConfigured,
  sportApiRemaining,
  type LineupInfo,
  type RefereeInfo,
} from "./sportapi";

/**
 * What decides a prop or a cards line but isn't in the odds: who actually starts, and
 * who the referee is. Kept per match in the database; the line-up is re-read more and
 * more often as kick-off nears (until the official one is out), the referee once.
 */

export interface MatchContext {
  at: number;
  referee: RefereeInfo | null;
  lineup: LineupInfo | null;
}

const KEY = (eventId: number) => `sa_ctx_${eventId}`;
/** Context is a nice-to-have: leave the SportAPI allowance for the essentials. */
const RESERVE = 250;

async function read(eventId: number): Promise<MatchContext | null> {
  const row = await db.select().from(feedMeta).where(eq(feedMeta.key, KEY(eventId))).get();
  return row ? (JSON.parse(row.value) as MatchContext) : null;
}

async function write(eventId: number, ctx: MatchContext) {
  const value = JSON.stringify(ctx);
  await db
    .insert(feedMeta)
    .values({ key: KEY(eventId), value })
    .onConflictDoUpdate({ target: feedMeta.key, set: { value } });
}

/** How old the line-up may be before it is read again, given the time to kick-off. */
function lineupTtlMs(startsAt: string, ctx: MatchContext | null, now: number): number {
  const mins = (new Date(startsAt).getTime() - now) / 60_000;
  if (mins <= 0) return Infinity; // started: nothing left to learn
  if (ctx?.lineup?.confirmed) return Infinity; // official eleven is out
  if (mins <= 100) return 12 * 60_000;
  if (mins <= 360) return 90 * 60_000;
  return 6 * 3_600_000;
}

/**
 * The context for one match, refreshed if it is stale. Fails soft: no key, allowance
 * low or a provider hiccup → whatever is cached (possibly nothing).
 */
export async function getMatchContext(eventId: number, startsAt: string): Promise<MatchContext | null> {
  await dbReady;
  const now = Date.now();
  const cached = await read(eventId);
  if (cached && now - cached.at < lineupTtlMs(startsAt, cached, now)) return cached;
  if (!sportApiConfigured()) return cached;
  const left = sportApiRemaining();
  if (left !== null && left < RESERVE) return cached;
  try {
    const lineup = await eventLineup(eventId);
    // The referee is named once; keep asking only while we don't have one.
    const referee = cached?.referee ?? (await eventReferee(eventId));
    const ctx: MatchContext = { at: now, referee, lineup };
    await write(eventId, ctx);
    return ctx;
  } catch (err) {
    console.error("[context] could not refresh", eventId, err);
    return cached;
  }
}

/** All cached contexts, by event id — for filtering a feed without any API calls. */
export async function loadContexts(): Promise<Map<number, MatchContext>> {
  await dbReady;
  const rows = await db
    .select()
    .from(feedMeta)
    .where(sql`${feedMeta.key} like 'sa_ctx_%'`)
    .all();
  const out = new Map<number, MatchContext>();
  for (const r of rows) {
    try {
      out.set(Number(r.key.slice("sa_ctx_".length)), JSON.parse(r.value) as MatchContext);
    } catch {
      /* skip a corrupt row */
    }
  }
  return out;
}

let checkedAt = 0;

/** Refresh the line-ups of matches kicking off in the next six hours that have props or cards lines. */
export async function refreshMatchContexts(max = 12): Promise<number> {
  if (Date.now() - checkedAt < 60_000) return 0;
  checkedAt = Date.now();
  await dbReady;
  const now = Date.now();
  const rows = await db
    .select()
    .from(nicheFixtures)
    .where(
      and(
        isNotNull(nicheFixtures.eventId),
        isNotNull(nicheFixtures.oppsJson),
        ne(nicheFixtures.oppsJson, "[]"),
        gt(nicheFixtures.startsAt, new Date(now).toISOString()),
        lt(nicheFixtures.startsAt, new Date(now + 6 * 3_600_000).toISOString()),
      ),
    )
    .all();
  rows.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  let done = 0;
  for (const r of rows.slice(0, max)) {
    const before = (await read(r.eventId!))?.at;
    const ctx = await getMatchContext(r.eventId!, r.startsAt);
    if (ctx && ctx.at !== before) done++;
  }
  return done;
}
