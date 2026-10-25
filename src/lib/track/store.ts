import "server-only";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import type { MarketType, SettledPick, ValueOpportunity } from "@/types";
import { db, dbReady } from "@/lib/db";
import { feedMeta, trackPicks } from "@/lib/db/schema";
import { apiFootballConfigured, lastKnownRemaining } from "@/lib/odds/api-football";
import { findPlayer } from "@/lib/odds/player-model";
import { matchTeam } from "@/lib/odds/player-stats-store";
import {
  gradeMain,
  gradeProp,
  parseMainId,
  profitUnits,
  type MainSpec,
  type PickOutcome,
  type PropSpec,
} from "./grade";
import {
  fetchCorners,
  fetchDayFixtures,
  fetchFixtureOutcome,
  fetchMatchPlayers,
  type DayFixture,
} from "./results-api";

/** A value bet only enters the track record at or above this edge (%). */
const TRACK_MIN_EDGE = 3;
/** Grade this long after kick-off, when the data provider has the final numbers. */
const SETTLE_AFTER_MS = 3 * 3_600_000;
/** Give up on a pick we can't grade after this long (it counts as void). */
const GIVE_UP_AFTER_MS = 4 * 24 * 3_600_000;
/** Fixtures graded per run, and the API quota we always leave untouched. */
const MAX_FIXTURES_PER_RUN = 10;
const KEEP_QUOTA = 15;

type GradeJson =
  | { type: "main"; apiFixtureId: number; spec: MainSpec }
  | { type: "prop"; spec: PropSpec };

function gradeFor(o: ValueOpportunity): GradeJson | null {
  if (o.propSpec) return { type: "prop", spec: o.propSpec };
  const main = parseMainId(o.id);
  return main ? { type: "main", ...main } : null;
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
  // The freshest number we have: this process's last response, else what the odds job stored.
  const live = lastKnownRemaining();
  const row = await db.select().from(feedMeta).where(eq(feedMeta.key, "api_remaining")).get();
  const remaining = live ?? Number(row?.value ?? NaN);
  return !(Number.isFinite(remaining) && remaining < KEEP_QUOTA);
}

/** Find a match's API-Football id from its teams + kick-off (cached per day within a run). */
async function resolveFixtureId(
  p: Row,
  days: Map<string, DayFixture[]>,
): Promise<number | null> {
  const date = p.startsAt.slice(0, 10);
  if (!days.has(date)) days.set(date, await fetchDayFixtures(date));
  const teamsOfLeague = days.get(date)!.filter((f) => f.leagueId === p.leagueId);
  const home = matchTeam(p.homeTeam, teamsOfLeague.map((f) => ({ id: f.id, name: f.homeTeam })));
  if (!home) return null;
  const hit = teamsOfLeague.find(
    (f) =>
      f.id === home.id &&
      matchTeam(p.awayTeam, [{ id: f.id, name: f.awayTeam }]) &&
      Math.abs(new Date(f.startsAt).getTime() - new Date(p.startsAt).getTime()) < 3 * 3_600_000,
  );
  return hit?.id ?? null;
}

/** Grade every pending pick whose match is over. Fails soft; unresolved picks stay pending. */
export async function settlePending(): Promise<{ settled: number }> {
  if (!apiFootballConfigured()) return { settled: 0 };
  await dbReady;
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

  // Picks that have outlived the provider's data are voided rather than left hanging forever.
  const stale = due.filter((p) => now - new Date(p.startsAt).getTime() > GIVE_UP_AFTER_MS);
  await setStatus(stale.map((p) => p.id), "void");

  // Group by match: one set of API calls grades every pick on it.
  const days = new Map<string, DayFixture[]>();
  const byMatch = new Map<string, { apiId: number | null; picks: Row[] }>();
  for (const p of due.filter((x) => !stale.includes(x))) {
    const g = JSON.parse(p.gradeJson) as GradeJson;
    let key: string;
    let apiId: number | null = null;
    if (g.type === "main") {
      apiId = g.apiFixtureId;
      key = `m${apiId}`;
    } else {
      key = `p${p.leagueId}|${p.homeTeam}|${p.awayTeam}|${p.startsAt}`;
    }
    const entry = byMatch.get(key) ?? { apiId, picks: [] };
    entry.picks.push(p);
    byMatch.set(key, entry);
  }

  let settled = stale.length;
  let fixtures = 0;
  try {
    for (const entry of byMatch.values()) {
      if (fixtures >= MAX_FIXTURES_PER_RUN || !(await quotaLeft())) break;
      fixtures++;
      try {
      const apiId = entry.apiId ?? (await resolveFixtureId(entry.picks[0], days));
      if (!apiId) continue; // can't place the match yet — try again next run

      const outcome = await fetchFixtureOutcome(apiId);
      if (outcome.state === "pending") continue;
      if (outcome.state === "void") {
        await setStatus(entry.picks.map((p) => p.id), "void");
        settled += entry.picks.length;
        continue;
      }

      const needCorners = entry.picks.some((p) => {
        const g = JSON.parse(p.gradeJson) as GradeJson;
        return g.type === "main" && g.spec.kind === "corners";
      });
      const needPlayers = entry.picks.some((p) => (JSON.parse(p.gradeJson) as GradeJson).type === "prop");
      const corners = needCorners ? await fetchCorners(apiId) : null;
      const players = needPlayers ? await fetchMatchPlayers(apiId) : [];
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
          result = gradeMain(g.spec, { home: outcome.home, away: outcome.away, corners });
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
        // One match failing (provider error, day outside the plan) must not block the rest.
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
