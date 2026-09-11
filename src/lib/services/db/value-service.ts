import "server-only";
import { eq } from "drizzle-orm";
import type { ValueOpportunity } from "@/types";
import { MOCK_VALUE_OPPORTUNITIES } from "@/lib/mock-data";
import { filterOpportunities } from "@/lib/filtering";
import { db, dbReady } from "@/lib/db";
import { opportunityReads } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth/session";
import type { ValueService } from "../types";

/**
 * The opportunity list itself is still generated (`src/lib/mock-data`) — it's the
 * "feed", not user data. Only the per-user *read* state is persisted here.
 */
async function readIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ opportunityId: opportunityReads.opportunityId })
    .from(opportunityReads)
    .where(eq(opportunityReads.userId, userId))
    .all();
  return new Set(rows.map((r) => r.opportunityId));
}

function withRead(o: ValueOpportunity, read: Set<string>): ValueOpportunity {
  return { ...o, read: o.read || read.has(o.id) };
}

export function createDbValueService(): ValueService {
  return {
    async listOpportunities(filters) {
      await dbReady;
      const read = await readIds(await requireUserId());
      return filterOpportunities(
        MOCK_VALUE_OPPORTUNITIES.map((o) => withRead(o, read)),
        filters,
      );
    },

    async getOpportunity(id) {
      await dbReady;
      const read = await readIds(await requireUserId());
      const found = MOCK_VALUE_OPPORTUNITIES.find((o) => o.id === id);
      return found ? withRead(found, read) : null;
    },

    async getUnreadCount() {
      await dbReady;
      const read = await readIds(await requireUserId());
      return MOCK_VALUE_OPPORTUNITIES.filter(
        (o) => !o.read && !read.has(o.id),
      ).length;
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
