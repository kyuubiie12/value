import "server-only";
import { eq } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { feedMeta } from "@/lib/db/schema";
import { matchStatsCached } from "./match-stats";
import { recentMatchesCached } from "./player-history";
import { sportApiConfigured } from "./sportapi";
import type { StatSample } from "./stat-markets";

/**
 * Both teams' last matches with cards and corners per half, for the "proven" check on
 * cards / corners lines. Match lists are shared with the player history and each
 * finished match's statistics are fetched once and kept. Fails soft → null.
 */

const PER_TEAM = 10;

export async function fixtureStatSamples(
  homeId: number | null | undefined,
  awayId: number | null | undefined,
): Promise<{ home: StatSample[]; away: StatSample[] } | null> {
  if (!homeId || !awayId || !sportApiConfigured()) return null;
  await dbReady;
  const blocked = await db.select().from(feedMeta).where(eq(feedMeta.key, "sa_blocked_until")).get();
  if (Number(blocked?.value ?? 0) > Date.now()) return null;

  try {
    const one = async (teamId: number): Promise<StatSample[]> => {
      const recent = (await recentMatchesCached(teamId, PER_TEAM)).slice(0, PER_TEAM);
      const out: StatSample[] = [];
      for (const m of recent) {
        const stats = await matchStatsCached(m.id);
        if (stats) out.push({ date: m.date, home: m.home, stats });
      }
      return out;
    };
    return { home: await one(homeId), away: await one(awayId) };
  } catch (err) {
    console.error("[team-stats] failed:", err);
    return null;
  }
}
