"use server";

import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth/session";
import { pushConfigured, sendPushToUser } from "./send";

export interface BrowserPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Does the server have VAPID keys? The UI hides push controls when not. */
export async function pushStatusAction(): Promise<{
  configured: boolean;
  devices: number;
}> {
  const userId = await requireUserId();
  await dbReady;
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  return { configured: pushConfigured(), devices: Number(row?.n ?? 0) };
}

/** Save (or re-home) this browser's subscription for the signed-in user. */
export async function subscribePushAction(
  sub: BrowserPushSubscription,
  userAgent?: string,
): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  if (
    !sub?.endpoint?.startsWith("https://") ||
    !sub.keys?.p256dh ||
    !sub.keys?.auth
  ) {
    return { ok: false };
  }
  await dbReady;
  // One endpoint = one browser install; if it was subscribed under another
  // account on this device, move it to the current user.
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
  await db.insert(pushSubscriptions).values({
    id: randomUUID(),
    userId,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    userAgent: userAgent?.slice(0, 200) ?? null,
    createdAt: new Date().toISOString(),
  });
  return { ok: true };
}

export async function unsubscribePushAction(endpoint: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  await dbReady;
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
  return { ok: true };
}

/** "Send test" button — proves the whole pipe works on the user's devices. */
export async function sendTestPushAction(): Promise<{
  sent: number;
  configured: boolean;
}> {
  const userId = await requireUserId();
  const r = await sendPushToUser(userId, {
    title: "Mentor — test",
    body: "Push virker. Du får besked her, når der er nyt at se.",
    url: "/value-bets",
    tag: "test",
  });
  return { sent: r.sent, configured: r.configured };
}
