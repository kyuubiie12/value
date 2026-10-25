import "server-only";
import { eq } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { feedMeta, matchPlayers } from "@/lib/db/schema";
import { ApiFootballError, apiFootballConfigured, lastKnownRemaining } from "./api-football";
import { fetchMatchPlayers, fetchTeamFinished, type FinishedFixture } from "@/lib/track/results-api";
import type { PlayerMatchStat } from "@/lib/track/grade";
import { resolveFixtureTeams } from "./player-stats-store";
import { HISTORY_MATCHES, type Appearance } from "./history-model";

/**
 * Each player's last matches, for the "proven value" check. A team's recent
 * results come from API-Football (one call per team per half day); a finished
 * match's player lines never change, so each is fetched once and kept.
 * Fails soft: no key, no access to the season, or no quota → null.
 */

const RECENT_TTL_MS = 12 * 3_600_000;
const MIN_QUOTA = 25;

interface StoredPlayer {
  id: number;
  name: string;
  teamId: number;
  stat: PlayerMatchStat;
}

export interface HistoryPlayer {
  id: number;
  name: string;
  appearances: Appearance[];
}

const matchesWanted = () => Number(process.env.API_FOOTBALL_HISTORY_MATCHES) || HISTORY_MATCHES;

async function meta(key: string): Promise<string | null> {
  const row = await db.select().from(feedMeta).where(eq(feedMeta.key, key)).get();
  return row?.value ?? null;
}
async function setMeta(key: string, value: string) {
  await db
    .insert(feedMeta)
    .values({ key, value })
    .onConflictDoUpdate({ target: feedMeta.key, set: { value } });
}

async function quotaOk(): Promise<boolean> {
  const live = lastKnownRemaining();
  const stored = Number((await meta("api_remaining")) ?? NaN);
  const remaining = live ?? stored;
  return !(Number.isFinite(remaining) && remaining < MIN_QUOTA);
}

/** A team's newest finished matches, topping up from the previous season early in a season. */
async function recentFixtures(teamId: number, season: number, want: number): Promise<FinishedFixture[]> {
  const key = `af_recent_${teamId}_${season}_${want}`;
  const cachedAt = Number((await meta(`${key}_at`)) ?? 0);
  const cached = await meta(key);
  if (cached && Date.now() - cachedAt < RECENT_TTL_MS) return JSON.parse(cached) as FinishedFixture[];

  let list = (await fetchTeamFinished(teamId, season)).slice(0, want);
  if (list.length < want) {
    try {
      list = [...list, ...(await fetchTeamFinished(teamId, season - 1))].slice(0, want);
    } catch {
      /* previous season not on the plan — use what we have */
    }
  }
  await setMeta(key, JSON.stringify(list));
  await setMeta(`${key}_at`, String(Date.now()));
  return list;
}

async function playersOfMatch(fixtureId: number): Promise<StoredPlayer[]> {
  const row = await db.select().from(matchPlayers).where(eq(matchPlayers.fixtureId, fixtureId)).get();
  if (row) return JSON.parse(row.playersJson) as StoredPlayer[];
  const players = await fetchMatchPlayers(fixtureId);
  await db
    .insert(matchPlayers)
    .values({ fixtureId, playersJson: JSON.stringify(players), fetchedAt: new Date().toISOString() })
    .onConflictDoNothing();
  return players;
}

/** Everyone who played for either team in their last matches, with per-match lines. */
export async function fixtureHistory(
  leagueId: string,
  homeTeam: string,
  awayTeam: string,
): Promise<{ players: HistoryPlayer[]; season: number } | null> {
  if (!apiFootballConfigured()) return null;
  await dbReady;
  if (Date.now() < Number((await meta("hist_blocked_until")) ?? 0)) return null;
  if (!(await quotaOk())) return null;

  try {
    const resolved = await resolveFixtureTeams(leagueId, homeTeam, awayTeam);
    if (!resolved) return null;
    const want = matchesWanted();
    const byPlayer = new Map<number, HistoryPlayer>();

    for (const teamId of resolved.teamIds) {
      const recent = await recentFixtures(teamId, resolved.season, want);
      for (const fx of recent) {
        if (!(await quotaOk())) throw new ApiFootballError("out of quota while reading history", true);
        for (const p of await playersOfMatch(fx.id)) {
          if (p.teamId !== teamId) continue;
          const entry = byPlayer.get(p.id) ?? { id: p.id, name: p.name, appearances: [] };
          entry.appearances.push({ fixtureId: fx.id, date: fx.date, stat: p.stat });
          byPlayer.set(p.id, entry);
        }
      }
    }
    for (const p of byPlayer.values()) p.appearances.sort((a, b) => b.date.localeCompare(a.date));
    return byPlayer.size ? { players: [...byPlayer.values()], season: resolved.season } : null;
  } catch (err) {
    // Plan / quota problems: stop trying for a while instead of burning calls.
    if (err instanceof ApiFootballError) {
      await setMeta("hist_blocked_until", String(Date.now() + 6 * 3_600_000));
    } else {
      console.error("[history] failed:", err);
    }
    return null;
  }
}
