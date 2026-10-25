import "server-only";
import { and, desc, eq } from "drizzle-orm";
import type { AppNotification, NotificationKind } from "@/types";
import { db, dbReady } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth/session";
import type { NotificationService } from "../types";

/** The user's real notifications, written by the background job (`lib/notify`). */
export function createRealNotificationService(): NotificationService {
  return {
    async list(): Promise<AppNotification[]> {
      await dbReady;
      const userId = await requireUserId();
      const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(60)
        .all();
      return rows.map((r) => ({
        id: r.id,
        kind: r.kind as NotificationKind,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt,
        read: r.read === 1,
        href: r.href ?? undefined,
      }));
    },

    async unreadCount(): Promise<number> {
      await dbReady;
      const userId = await requireUserId();
      const rows = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.read, 0)))
        .all();
      return rows.length;
    },

    async markRead(id: string) {
      await dbReady;
      const userId = await requireUserId();
      await db
        .update(notifications)
        .set({ read: 1 })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    },

    async markAllRead() {
      await dbReady;
      const userId = await requireUserId();
      await db.update(notifications).set({ read: 1 }).where(eq(notifications.userId, userId));
    },
  };
}
