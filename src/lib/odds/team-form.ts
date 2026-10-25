import "server-only";
import { eq } from "drizzle-orm";
import type { TeamFormMatch } from "@/types";
import { db, dbReady } from "@/lib/db";
import { feedMeta } from "@/lib/db/schema";
import { recentMatchesCached } from "./player-history";
import { matchStatsCached } from "./match-stats";
import { sportApiConfigured, sportApiRemaining } from "./sportapi";

/**
 * Both teams' last matches for the "why is this value" reasoning. The team ids
 * come with the OddsPapi fixture (they are SportAPI's team ids too), and the
 * matches from the same cached call the player history uses — so form costs
 * next to nothing. Fails soft: no key / blocked / unknown ids → null.
 */

const RESERVE = 40;
export const FORM_MATCHES = 5;

/** A finished match's corner split (from the cached match statistics). */
async function cornersOf(eventId: number): Promise<{ home: number; away: number } | null> {
  const stats = await matchStatsCached(eventId);
  const c = stats?.corners.ft;
  return c ? { home: c[0], away: c[1] } : null;
}

export async function fixtureForm(
  homeId: number | null | undefined,
  awayId: number | null | undefined,
): Promise<{ home: TeamFormMatch[]; away: TeamFormMatch[] } | null> {
  if (!homeId || !awayId || !sportApiConfigured()) return null;
  await dbReady;
  const blocked = await db.select().from(feedMeta).where(eq(feedMeta.key, "sa_blocked_until")).get();
  if (Number(blocked?.value ?? 0) > Date.now()) return null;
  const left = sportApiRemaining();
  if (left !== null && left < RESERVE) return null;

  try {
    const toForm = async (id: number): Promise<TeamFormMatch[]> => {
      const recent = (await recentMatchesCached(id, 10)).slice(0, FORM_MATCHES);
      const out: TeamFormMatch[] = [];
      for (const m of recent) {
        const form: TeamFormMatch = { date: m.date, gf: m.gf, ga: m.ga, home: m.home, opponent: m.opponent };
        const corners = await cornersOf(m.id);
        if (corners) {
          form.cf = m.home ? corners.home : corners.away;
          form.ca = m.home ? corners.away : corners.home;
        }
        out.push(form);
      }
      return out;
    };
    return { home: await toForm(homeId), away: await toForm(awayId) };
  } catch (err) {
    console.error("[form] failed:", err);
    return null;
  }
}
