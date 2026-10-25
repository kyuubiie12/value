import "server-only";
import { cache } from "react";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import type { ValueOpportunity } from "@/types";
import { filterOpportunities } from "@/lib/filtering";
import { db, dbReady } from "@/lib/db";
import { opportunityReads } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth/session";
import { detectValue } from "@/lib/odds/detect";
import { feedStatus, loadPricedFixtures, needsRefresh, refreshOdds } from "@/lib/odds/store";
import { oddsPapiConfigured } from "@/lib/odds/oddspapi";
import { loadNicheOpportunities, needsNicheRefresh, refreshNiche } from "@/lib/odds/niche-store";
import { needsTrackingJob, runTrackingJob } from "@/lib/track/job";
import type { ValueService } from "../types";

/**
 * Value opportunities from real odds (API-Football): the cached fixtures are
 * turned into opportunities on read, so a fresh snapshot shows up everywhere at
 * once. Per-user read-state is stored exactly like the generated feed.
 */

async function readIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ opportunityId: opportunityReads.opportunityId })
    .from(opportunityReads)
    .where(eq(opportunityReads.userId, userId))
    .all();
  return new Set(rows.map((r) => r.opportunityId));
}

/** One detection pass per request, however many components ask for the feed. */
const detectAll = cache(async (): Promise<ValueOpportunity[]> => {
  const [fixtures, niche] = await Promise.all([
    loadPricedFixtures(),
    oddsPapiConfigured() ? loadNicheOpportunities() : Promise.resolve([]),
  ]);
  return [...fixtures.flatMap(detectValue), ...niche].sort(
    (a, b) => b.edgePercent - a.edgePercent,
  );
});

export function createOddsValueService(): ValueService {
  return {
    async listOpportunities(filters) {
      await dbReady;
      // Keep the cache warm in the background; this request is served from what we have.
      if (await needsRefresh()) after(() => refreshOdds());
      if (oddsPapiConfigured() && (await needsNicheRefresh())) after(() => refreshNiche());
      // Save the bets we're showing and grade the ones whose match is over.
      if (await needsTrackingJob()) after(() => runTrackingJob());
      const [all, read] = await Promise.all([detectAll(), requireUserId().then(readIds)]);
      return filterOpportunities(
        all.map((o) => ({ ...o, read: read.has(o.id) })),
        filters,
      );
    },

    async getOpportunity(id) {
      await dbReady;
      const [all, read] = await Promise.all([detectAll(), requireUserId().then(readIds)]);
      const found = all.find((o) => o.id === id);
      return found ? { ...found, read: read.has(found.id) } : null;
    },

    async getUnreadCount() {
      await dbReady;
      const [all, read] = await Promise.all([detectAll(), requireUserId().then(readIds)]);
      return all.filter((o) => !read.has(o.id)).length;
    },

    async getFeedStatus() {
      return { source: "live", ...(await feedStatus()) };
    },

    async markRead(id) {
      await dbReady;
      const userId = await requireUserId();
      await db
        .insert(opportunityReads)
        .values({ userId, opportunityId: id })
        .onConflictDoNothing();
    },
  };
}
