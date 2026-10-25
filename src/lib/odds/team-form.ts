import "server-only";
import { eq } from "drizzle-orm";
import type { TeamFormMatch } from "@/types";
import { db, dbReady } from "@/lib/db";
import { feedMeta, nicheFixtures } from "@/lib/db/schema";
import { recentMatchesCached } from "./player-history";
import { looseSameTeam, matchTeam } from "./player-stats-store";
import { sportApiConfigured, sportApiRemaining } from "./sportapi";

/**
 * Both teams' last matches for the "why is this value" reasoning. Team ids come
 * from the OddsPapi fixture list we already store (team name → SportAPI id), and
 * the matches from the same cached call the player history uses — so form costs
 * next to nothing. Fails soft: no key / blocked / unknown team → null.
 */

const RESERVE = 40;
export const FORM_MATCHES = 5;

async function teamIdsOf(leagueId: string): Promise<{ id: number; name: string }[]> {
  const rows = await db.select().from(nicheFixtures).where(eq(nicheFixtures.leagueId, leagueId)).all();
  const seen = new Map<number, string>();
  for (const r of rows) {
    if (r.homeId) seen.set(r.homeId, r.homeTeam);
    if (r.awayId) seen.set(r.awayId, r.awayTeam);
  }
  return [...seen].map(([id, name]) => ({ id, name }));
}

export async function fixtureForm(
  leagueId: string,
  homeTeam: string,
  awayTeam: string,
): Promise<{ home: TeamFormMatch[]; away: TeamFormMatch[] } | null> {
  if (!sportApiConfigured()) return null;
  await dbReady;
  const blocked = await db.select().from(feedMeta).where(eq(feedMeta.key, "sa_blocked_until")).get();
  if (Number(blocked?.value ?? 0) > Date.now()) return null;
  const left = sportApiRemaining();
  if (left !== null && left < RESERVE) return null;

  try {
    const teams = await teamIdsOf(leagueId);
    const find = (name: string) => {
      const exact = matchTeam(name, teams);
      if (exact) return exact;
      const loose = teams.filter((t) => looseSameTeam(name, t.name));
      return loose.length === 1 ? loose[0] : null; // ambiguous (Manchester …) → don't guess
    };
    const home = find(homeTeam);
    const away = find(awayTeam);
    if (!home || !away) return null;
    const toForm = async (id: number) =>
      (await recentMatchesCached(id, 10)).slice(0, FORM_MATCHES).map(
        (m): TeamFormMatch => ({ date: m.date, gf: m.gf, ga: m.ga, home: m.home, opponent: m.opponent }),
      );
    return { home: await toForm(home.id), away: await toForm(away.id) };
  } catch (err) {
    console.error("[form] failed:", err);
    return null;
  }
}
