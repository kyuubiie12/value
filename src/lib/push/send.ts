import "server-only";
import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";

/**
 * Web Push delivery. Keys come from env (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
 * `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`); without them push is simply "not
 * configured" and every call is a no-op rather than an error.
 */

export interface PushPayload {
  title: string;
  body: string;
  /** Where a tap on the notification should land. */
  url?: string;
  /** Same tag replaces an earlier notification instead of stacking. */
  tag?: string;
}

let configured: boolean | null = null;

export function pushConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    pub,
    priv,
  );
  return (configured = true);
}

/** Send to every device a user has subscribed. Dead subscriptions are pruned. */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number; configured: boolean }> {
  if (!pushConfigured()) return { sent: 0, removed: 0, configured: false };
  await dbReady;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: 60 * 60 },
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410 = the browser dropped the subscription — forget it.
        if (status === 404 || status === 410) dead.push(s.id);
        else console.error("Web push failed", status, (err as Error).message);
      }
    }),
  );

  if (dead.length) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, dead));
  }
  return { sent, removed: dead.length, configured: true };
}
