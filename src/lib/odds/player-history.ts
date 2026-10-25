import "server-only";
import { eq } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { feedMeta, matchPlayers } from "@/lib/db/schema";
import type { PlayerMatchStat } from "@/lib/track/grade";
import { HISTORY_MATCHES, type Appearance } from "./history-model";
import {
  matchPlayers as sportApiMatchPlayers,
  sportApiConfigured,
  sportApiRemaining,
  SportApiError,
  teamRecentMatches,
  type RecentMatch,
} from "./sportapi";

/**
 * Each player's last matches, for the "proven value" check (SportAPI). A team's
 * recent results are cached for half a day; a finished match's player lines never
 * change, so each is fetched once and kept. Fails soft: no key, blocked, or
 * out of allowance → null, and the props simply aren't shown.
 */

const RECENT_TTL_MS = 12 * 3_600_000;
const SPORTAPI_RESERVE = Number(process.env.SPORTAPI_RESERVE) || 40;

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

const matchesWanted = () => Number(process.env.HISTORY_MATCHES) || HISTORY_MATCHES;

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

/** A team's recent matches (with scores), cached for half a day and shared by history and form. */
export async function recentMatchesCached(teamId: number, want: number): Promise<RecentMatch[]> {
  const key = `sa_recent2_${teamId}_${want}`;
  const cached = await meta(key);
  if (cached && Date.now() - Number((await meta(`${key}_at`)) ?? 0) < RECENT_TTL_MS) {
    return JSON.parse(cached) as RecentMatch[];
  }
  let recent: RecentMatch[];
  try {
    recent = await teamRecentMatches(teamId, want);
  } catch (err) {
    if (err instanceof SportApiError && !err.blocked && err.message.includes("404")) return []; // unknown team: nothing to add
    throw err;
  }
  await setMeta(key, JSON.stringify(recent));
  await setMeta(`${key}_at`, String(Date.now()));
  return recent;
}

/** Everyone who played for either team in their last matches, with per-match lines. */
export async function fixtureHistory(
  ids: { homeId?: number | null; awayId?: number | null },
): Promise<{ players: HistoryPlayer[]; season: number } | null> {
  await dbReady;
  if (!sportApiConfigured()) return null;
  const teamIds = [ids.homeId, ids.awayId].filter((x): x is number => typeof x === "number");
  if (!teamIds.length) return null;
  if (Date.now() < Number((await meta("sa_blocked_until")) ?? 0)) return null;

  const want = matchesWanted();
  const byPlayer = new Map<number, HistoryPlayer>();
  try {
    for (const teamId of teamIds) {
      for (const m of await recentMatchesCached(teamId, want)) {
        // Match ids are stored negated, in their own key space.
        const cacheId = -m.id;
        const row = await db.select().from(matchPlayers).where(eq(matchPlayers.fixtureId, cacheId)).get();
        let players: StoredPlayer[];
        if (row) {
          players = JSON.parse(row.playersJson) as StoredPlayer[];
        } else {
          const left = sportApiRemaining();
          if (left !== null && left < SPORTAPI_RESERVE) throw new SportApiError("SportAPI allowance nearly spent", true);
          try {
            players = await sportApiMatchPlayers(m.id);
          } catch (err) {
            // No line-ups for that one match (404): it simply adds nothing — it must not sink the whole record.
            if (err instanceof SportApiError && !err.blocked && err.message.includes("404")) players = [];
            else throw err;
          }
          await db
            .insert(matchPlayers)
            .values({ fixtureId: cacheId, playersJson: JSON.stringify(players), fetchedAt: new Date().toISOString() })
            .onConflictDoNothing();
        }
        for (const p of players) {
          if (p.teamId !== teamId) continue;
          const entry = byPlayer.get(p.id) ?? { id: p.id, name: p.name, appearances: [] };
          entry.appearances.push({ fixtureId: m.id, date: m.date, stat: p.stat });
          byPlayer.set(p.id, entry);
        }
      }
    }
  } catch (err) {
    if (err instanceof SportApiError && err.blocked) {
      // Not subscribed / allowance spent: stop trying for a while.
      await setMeta("sa_blocked_until", String(Date.now() + 6 * 3_600_000));
    } else {
      console.error("[history] SportAPI failed:", err);
    }
    return null;
  }
  for (const p of byPlayer.values()) p.appearances.sort((a, b) => b.date.localeCompare(a.date));
  return byPlayer.size ? { players: [...byPlayer.values()], season: new Date().getUTCFullYear() } : null;
}
