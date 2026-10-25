import "server-only";
import { eq } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { feedMeta } from "@/lib/db/schema";
import { detectValue } from "@/lib/odds/detect";
import { oddsPapiConfigured } from "@/lib/odds/oddspapi";
import { loadNicheOpportunities } from "@/lib/odds/niche-store";
import { loadPricedFixtures } from "@/lib/odds/store";
import { runNotificationJob } from "@/lib/notify/jobs";
import { recordPicks, settlePending } from "./store";

/**
 * The track record's background work: save every value bet the feed currently
 * shows (once, at its first price), then grade the ones whose match is over.
 * Runs at most every ~15 minutes, whoever's page view happens to trigger it.
 */

const EVERY_MS = 15 * 60_000;
const LOCK_MS = 4 * 60_000;

let checkedAt = 0;

export async function needsTrackingJob(): Promise<boolean> {
  if (Date.now() - checkedAt < 60_000) return false;
  checkedAt = Date.now();
  await dbReady;
  const rows = await db.select().from(feedMeta).all();
  const meta = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const now = Date.now();
  return now - Number(meta.track_last_at ?? 0) > EVERY_MS && Number(meta.track_lock ?? 0) < now;
}

async function setMeta(key: string, value: string) {
  await db
    .insert(feedMeta)
    .values({ key, value })
    .onConflictDoUpdate({ target: feedMeta.key, set: { value } });
}

export async function runTrackingJob(): Promise<{ added: number; settled: number }> {
  await dbReady;
  const now = Date.now();
  const lock = await db.select().from(feedMeta).where(eq(feedMeta.key, "track_lock")).get();
  if (Number(lock?.value ?? 0) > now) return { added: 0, settled: 0 };
  await setMeta("track_lock", String(now + LOCK_MS));
  try {
    const [fixtures, niche] = await Promise.all([
      loadPricedFixtures(),
      oddsPapiConfigured() ? loadNicheOpportunities() : Promise.resolve([]),
    ]);
    const all = [...fixtures.flatMap(detectValue), ...niche];
    const added = await recordPicks(all);
    const { settled } = await settlePending();
    // Users' bets follow the graded picks; then tell them what happened.
    await runNotificationJob(all);
    await setMeta("track_last_at", String(Date.now()));
    return { added, settled };
  } catch (err) {
    console.error("[track] job failed:", err);
    return { added: 0, settled: 0 };
  } finally {
    await setMeta("track_lock", "0");
  }
}
