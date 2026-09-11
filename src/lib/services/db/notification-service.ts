import "server-only";
import { eq } from "drizzle-orm";
import type { AppNotification } from "@/types";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data";
import { db, dbReady } from "@/lib/db";
import { notificationReads } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth/session";
import type { NotificationService } from "../types";

/**
 * Notifications are generated (`src/lib/mock-data`); only the per-user read state
 * is persisted. `markAllRead` records every current notification id as read.
 */
async function readIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ notificationId: notificationReads.notificationId })
    .from(notificationReads)
    .where(eq(notificationReads.userId, userId))
    .all();
  return new Set(rows.map((r) => r.notificationId));
}

export function createDbNotificationService(): NotificationService {
  return {
    async list(): Promise<AppNotification[]> {
      await dbReady;
      const read = await readIds(await requireUserId());
      return MOCK_NOTIFICATIONS.map((n) => ({
        ...n,
        read: n.read || read.has(n.id),
      })).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    },

    async unreadCount(): Promise<number> {
      await dbReady;
      const read = await readIds(await requireUserId());
      return MOCK_NOTIFICATIONS.filter((n) => !n.read && !read.has(n.id)).length;
    },

    async markRead(id: string) {
      await dbReady;
      const userId = await requireUserId();
      await db
        .insert(notificationReads)
        .values({ userId, notificationId: id })
        .onConflictDoNothing();
    },

    async markAllRead() {
      await dbReady;
      const userId = await requireUserId();
      const rows = MOCK_NOTIFICATIONS.map((n) => ({
        userId,
        notificationId: n.id,
      }));
      if (rows.length)
        await db.insert(notificationReads).values(rows).onConflictDoNothing();
    },
  };
}
