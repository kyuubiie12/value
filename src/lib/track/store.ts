import "server-only";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import type { MarketType, SettledPick, ValueOpportunity } from "@/types";
import { db, dbReady } from "@/lib/db";
import { trackPicks } from "@/lib/db/schema";
import { findPlayer } from "@/lib/odds/player-model";
import {
  fetchMatchStats,
  findFinishedMatch,
  liveMatches,
  matchCorners,
  matchPlayers,
  sportApiConfigured,
  sportApiRemaining,
  type LiveMatch,
} from "@/lib/odds/sportapi";
import {
  gradeMain,
  gradeProp,
  gradeStat,
  parseMainId,
  statWonAlready,
  profitUnits,
  type MainSpec,
  type PickOutcome,
  type PropSpec,
  type StatSpec,
} from "./grade";

/** A value bet only enters the track record at or above this edge (%). */
const TRACK_MIN_EDGE = 3;
/** Grade this long after kick-off, when the data provider has the final numbers. */
const SETTLE_AFTER_MS = 135 * 60_000;
/** Give up on a pick we can't grade after this long (it counts as void). */
const GIVE_UP_AFTER_MS = 4 * 24 * 3_600_000;
/** Fixtures graded per run, and the API quota we always leave untouched. */
const MAX_FIXTURES_PER_RUN = 10;
const KEEP_QUOTA = 15;

type GradeJson = { teamIds?: { home: number; away: number } } & (
  | { type: "main"; spec: MainSpec }
  | { type: "prop"; spec: PropSpec }
  | { type: "stat"; spec: StatSpec }
);

function gradeFor(o: ValueOpportunity): GradeJson | null {
  // Without both team ids the finished match can't be found again — don't track it.
  if (!o.teamIds) return null;
  if (o.propSpec) return { type: "prop", spec: o.propSpec, teamIds: o.teamIds };
  if (o.statSpec) return { type: "stat", spec: o.statSpec, teamIds: o.teamIds };
  const main = parseMainId(o.id);
  return main ? { type: "main", spec: main.spec, teamIds: o.teamIds } : null;
}

/** Store new value bets at their first price; keep the "closing" price fresh until kick-off. */
export async function recordPicks(opps: ValueOpportunity[]): Promise<number> {
  await dbReady;
  const now = new Date();
  let added = 0;
  for (const o of opps) {
    if (o.edgePercent < TRACK_MIN_EDGE || new Date(o.startsAt) <= now) continue;
    const grade = gradeFor(o);
    if (!grade) continue;
    const existing = await db
      .select({ status: trackPicks.status })
      .from(trackPicks)
      .where(eq(trackPicks.id, o.id))
      .get();
    if (existing) {
      if (existing.status === "pending") {
        await db.update(trackPicks).set({ closingOdds: o.bestOdds }).where(eq(trackPicks.id, o.id));
      }
      continue;
    }
    await db.insert(trackPicks).values({
      id: o.id,
      leagueId: o.leagueId,
      league: o.league,
      homeTeam: o.homeTeam,
      awayTeam: o.awayTeam,
      startsAt: o.startsAt,
      market: o.market,
      marketLabel: o.marketLabel,
      selection: o.selection,
      bookmakerId: o.bestBookmakerId,
      postedOdds: o.bestOdds,
      closingOdds: o.bestOdds,
      edgePercent: o.edgePercent,
      confidence: o.confidence,
      gradeJson: JSON.stringify(grade),
      postedAt: now.toISOString(),
      status: "pending",
    });
    added++;
  }
  return added;
}

type Row = typeof trackPicks.$inferSelect;

async function setStatus(ids: string[], status: PickOutcome) {
  if (!ids.length) return;
  await db
    .update(trackPicks)
    .set({ status, settledAt: new Date().toISOString() })
    .where(inArray(trackPicks.id, ids));
}

async function quotaLeft(): Promise<boolean> {
  const left = sportApiRemaining();
  return !(left !== null && left < KEEP_QUOTA);
}

/**
 * A bet that only needs something to happen ("1+ skud", "over 2,5 mål") is won the
 * moment it has — no need to wait for the final whistle. Only wins are settled here;
 * a loss can't be known until the match is over.
 */
async function settleWhileLive(): Promise<number> {
  const now = Date.now();
  const rows = await db
    .select()
    .from(trackPicks)
    .where(
      and(
        eq(trackPicks.status, "pending"),
        lt(trackPicks.startsAt, new Date(now).toISOString()),
        gt(trackPicks.startsAt, new Date(now - 4 * 3_600_000).toISOString()),
      ),
    )
    .all();
  if (!rows.length || !(await quotaLeft())) return 0;

  let live: LiveMatch[];
  try {
    live = await liveMatches();
  } catch (err) {
    console.error("[track] could not list live matches:", err);
    return 0;
  }

  const byMatch = new Map<number, { match: LiveMatch; picks: Row[] }>();
  for (const p of rows) {
    const g = JSON.parse(p.gradeJson) as GradeJson;
    if (!g.teamIds) continue;
    const match = live.find((m) => m.homeId === g.teamIds!.home && m.awayId === g.teamIds!.away);
    if (!match) continue;
    const entry = byMatch.get(match.eventId) ?? { match, picks: [] };
    entry.picks.push(p);
    byMatch.set(match.eventId, entry);
  }

  let won = 0;
  for (const { match, picks } of byMatch.values()) {
    if (!(await quotaLeft())) break;
    try {
      const specs = picks.map((p) => ({ p, g: JSON.parse(p.gradeJson) as GradeJson }));
      const needPlayers = specs.some((x) => x.g.type === "prop");
      const needStats = specs.some((x) => x.g.type === "stat");
      const players = needPlayers ? await matchPlayers(match.eventId) : [];
      const live = needStats ? await fetchMatchStats(match.eventId) : null;
      const roster = players.map((p) => ({
        id: p.id, first: "", last: "", name: p.name, position: "", apps: 0, minutes: 0,
        fouls: 0, tackles: 0, shots: 0, shotsOn: 0, cards: 0, saves: 0,
      }));
      const ids: string[] = [];
      for (const { p, g } of specs) {
        if (g.type === "prop") {
          const hit = findPlayer(roster, g.spec.player);
          const stat = hit ? players.find((x) => x.id === hit.id)?.stat : undefined;
          if (stat && gradeProp(g.spec, stat) === "won") ids.push(p.id);
        } else if (g.type === "stat") {
          if (statWonAlready(g.spec, live)) ids.push(p.id);
        } else if (
          (g.spec.kind === "goals" || g.spec.kind === "home-goals" || g.spec.kind === "away-goals") &&
          g.spec.side === "over" &&
          gradeMain(g.spec, { home: match.home, away: match.away, corners: null }) === "won"
        ) {
          ids.push(p.id);
        }
      }
      await setStatus(ids, "won");
      won += ids.length;
    } catch (err) {
      console.error("[track] live check failed for a match:", err);
    }
  }
  return won;
}

/** Grade every pending pick whose match is over (SportAPI). Fails soft; unresolved picks stay pending. */
export async function settlePending(): Promise<{ settled: number }> {
  if (!sportApiConfigured()) return { settled: 0 };
  await dbReady;
  const early = await settleWhileLive();
  if (early) return { settled: early + (await settleFinished()).settled };
  return settleFinished();
}

async function settleFinished(): Promise<{ settled: number }> {
  const now = Date.now();
  const due = await db
    .select()
    .from(trackPicks)
    .where(
      and(
        eq(trackPicks.status, "pending"),
        lt(trackPicks.startsAt, new Date(now - SETTLE_AFTER_MS).toISOString()),
      ),
    )
    .all();
  if (!due.length) return { settled: 0 };

  // Picks that have outlived the provider's data (or can't be placed) are voided, not left hanging.
  const stale = due.filter((p) => now - new Date(p.startsAt).getTime() > GIVE_UP_AFTER_MS);
  await setStatus(stale.map((p) => p.id), "void");

  // Group by match: one set of calls grades every pick on it.
  const byMatch = new Map<string, { teamIds: { home: number; away: number }; picks: Row[] }>();
  for (const p of due.filter((x) => !stale.includes(x))) {
    const g = JSON.parse(p.gradeJson) as GradeJson;
    if (!g.teamIds) continue; // legacy pick without team ids — voided once stale
    const key = `${g.teamIds.home}-${g.teamIds.away}-${p.startsAt}`;
    const entry = byMatch.get(key) ?? { teamIds: g.teamIds, picks: [] };
    entry.picks.push(p);
    byMatch.set(key, entry);
  }

  let settled = stale.length;
  let matches = 0;
  try {
    for (const entry of byMatch.values()) {
      if (matches >= MAX_FIXTURES_PER_RUN || !(await quotaLeft())) break;
      matches++;
      try {
        const found = await findFinishedMatch(entry.teamIds.home, entry.teamIds.away, entry.picks[0].startsAt);
        if (!found) continue; // not finished (or not listed yet) — try again next run

        const needCorners = entry.picks.some((p) => {
          const g = JSON.parse(p.gradeJson) as GradeJson;
          return g.type === "main" && g.spec.kind === "corners";
        });
        const needPlayers = entry.picks.some((p) => (JSON.parse(p.gradeJson) as GradeJson).type === "prop");
        const needStats = entry.picks.some((p) => (JSON.parse(p.gradeJson) as GradeJson).type === "stat");
        const finalStats = needStats ? await fetchMatchStats(found.eventId) : null;
        const corners = needCorners ? await matchCorners(found.eventId) : null;
        const players = needPlayers ? await matchPlayers(found.eventId) : [];
        const roster = players.map((p) => ({
          id: p.id, first: "", last: "", name: p.name, position: "", apps: 0, minutes: 0,
          fouls: 0, tackles: 0, shots: 0, shotsOn: 0, cards: 0, saves: 0,
        }));

        const won: string[] = [];
        const lost: string[] = [];
        const voided: string[] = [];
        for (const p of entry.picks) {
          const g = JSON.parse(p.gradeJson) as GradeJson;
          let result: PickOutcome | null = null;
          if (g.type === "main") {
            result = gradeMain(g.spec, { home: found.home, away: found.away, corners });
          } else if (g.type === "stat") {
            result = gradeStat(g.spec, finalStats); // no statistics yet → try again later
          } else {
            const hit = findPlayer(roster, g.spec.player);
            const stat = hit ? players.find((x) => x.id === hit.id)?.stat : undefined;
            result = stat ? gradeProp(g.spec, stat) : null; // unknown player → try again later
          }
          if (result === "won") won.push(p.id);
          else if (result === "lost") lost.push(p.id);
          else if (result === "void") voided.push(p.id);
        }
        await setStatus(won, "won");
        await setStatus(lost, "lost");
        await setStatus(voided, "void");
        settled += won.length + lost.length + voided.length;
      } catch (err) {
        // One match failing (provider error) must not block the rest.
        console.error("[track] could not grade a match:", err);
      }
    }
  } catch (err) {
    console.error("[track] settling failed:", err);
  }
  return { settled };
}

const clv = (posted: number, closing: number) => (closing > 0 ? (posted / closing - 1) * 100 : 0);

function toSettled(r: Row): SettledPick | null {
  if (r.status !== "won" && r.status !== "lost") return null; // void picks don't count
  const won = r.status === "won";
  return {
    id: r.id,
    postedAt: r.postedAt,
    settledAt: r.settledAt ?? r.startsAt,
    leagueId: r.leagueId,
    league: r.league,
    homeTeam: r.homeTeam,
    awayTeam: r.awayTeam,
    market: r.market as MarketType,
    marketLabel: r.marketLabel,
    selection: r.selection,
    bookmakerId: r.bookmakerId,
    postedOdds: r.postedOdds,
    closingOdds: r.closingOdds,
    clvPercent: Number(clv(r.postedOdds, r.closingOdds).toFixed(2)),
    edgePercent: r.edgePercent,
    stakeUnits: 1,
    result: r.status as "won" | "lost",
    profitUnits: Number(profitUnits(won ? "won" : "lost", r.postedOdds).toFixed(3)),
    confidence: r.confidence as SettledPick["confidence"],
  };
}

/** Every graded pick, newest first. */
export async function loadSettledPicks(): Promise<SettledPick[]> {
  await dbReady;
  const rows = await db
    .select()
    .from(trackPicks)
    .where(inArray(trackPicks.status, ["won", "lost"]))
    .all();
  return rows
    .map(toSettled)
    .filter((p): p is SettledPick => p !== null)
    .sort((a, b) => b.settledAt.localeCompare(a.settledAt));
}

/** Picks still waiting for their match to finish. */
export async function countPendingPicks(): Promise<number> {
  await dbReady;
  const row = await db
    .select({ n: sql<number>`count(*)` })
    .from(trackPicks)
    .where(eq(trackPicks.status, "pending"))
    .get();
  return row?.n ?? 0;
}
