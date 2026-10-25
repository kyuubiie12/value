import "server-only";
import { eq } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { feedMeta } from "@/lib/db/schema";
import { fetchMatchStats, sportApiRemaining, type MatchStats } from "./sportapi";

/**
 * Cards and corners per side and half for a FINISHED match. A finished match never
 * changes, so each one is fetched once and kept for good ("x" = the provider has
 * nothing). Fails soft: out of allowance or a provider hiccup → null, try again later.
 */

/** Corner/card statistics are a nice-to-have — leave plenty of the allowance for everything else. */
const RESERVE = 300;

export async function matchStatsCached(eventId: number): Promise<MatchStats | null> {
  await dbReady;
  const key = `sa_ms_${eventId}`;
  const row = await db.select().from(feedMeta).where(eq(feedMeta.key, key)).get();
  if (row) return row.value === "x" ? null : (JSON.parse(row.value) as MatchStats);
  const left = sportApiRemaining();
  if (left !== null && left < RESERVE) return null;
  try {
    const stats = await fetchMatchStats(eventId);
    const value = stats ? JSON.stringify(stats) : "x";
    await db
      .insert(feedMeta)
      .values({ key, value })
      .onConflictDoUpdate({ target: feedMeta.key, set: { value } });
    return stats;
  } catch {
    return null; // try again next time
  }
}
