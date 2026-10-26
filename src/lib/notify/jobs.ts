import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, gte, inArray, isNotNull } from "drizzle-orm";
import type { NotificationKind, UserSettings, ValueOpportunity } from "@/types";
import { db, dbReady } from "@/lib/db";
import {
  bets,
  notifications,
  notifySeen,
  trackPicks,
  userSettings,
  users,
} from "@/lib/db/schema";
import { DEFAULT_SETTINGS } from "@/lib/mock-data";
import { getBookmaker } from "@/lib/mock-data";
import { closingLineValue } from "@/lib/betting-math";
import { formatCurrency, formatOdds, formatPercent } from "@/lib/format";
import { notificationKindEnabled } from "@/lib/notification-prefs";
import { restrictOpportunityToBooks } from "@/lib/restrict-opportunity";
import { oddsAllowed } from "@/lib/filtering";
import { sendPushToUser } from "@/lib/push/send";

/**
 * Real notifications. Every generator is idempotent (the `dedupeKey` / seen
 * markers make a repeat run a no-op), runs in the background job, and stores the
 * message for the bell first — push is sent on top, only if the user ticked
 * that kind on. Nothing here needs a request or a session.
 */

interface UserRow {
  id: string;
  settings: UserSettings;
}

async function loadUsers(): Promise<UserRow[]> {
  const rows = await db
    .select({ id: users.id, data: userSettings.data })
    .from(users)
    .leftJoin(userSettings, eq(userSettings.userId, users.id))
    .all();
  return rows
    .map((r) => ({ id: r.id, settings: { ...DEFAULT_SETTINGS, ...(r.data ?? {}) } as UserSettings }))
    .filter((u) => u.settings.onboardingComplete);
}

/** Store a notification (once) and push it when the kind is switched on. */
async function notify(
  user: UserRow,
  kind: NotificationKind,
  title: string,
  body: string,
  href: string,
  dedupeKey: string,
): Promise<boolean> {
  const res = await db
    .insert(notifications)
    .values({
      id: randomUUID(),
      userId: user.id,
      kind,
      title,
      body,
      href,
      createdAt: new Date().toISOString(),
      read: 0,
      dedupeKey,
    })
    .onConflictDoNothing()
    .returning({ id: notifications.id });
  if (!res.length) return false;
  if (notificationKindEnabled(kind, user.settings)) {
    await sendPushToUser(user.id, { title, body, url: href, tag: dedupeKey }).catch(() => {});
  }
  return true;
}

const bookName = (id: string) => getBookmaker(id)?.name ?? id;
const signedKr = (n: number) => `${n >= 0 ? "+" : "−"}${formatCurrency(Math.abs(n))}`;

/**
 * Grade users' open bets from the track record: a bet taken from a feed pick is
 * settled the moment the pick is. Returns the notifications created.
 */
export async function settleUserBets(): Promise<number> {
  const open = await db
    .select()
    .from(bets)
    .where(and(eq(bets.status, "pending"), isNotNull(bets.sourceOpportunityId)))
    .all();
  if (!open.length) return 0;

  const ids = [...new Set(open.map((b) => b.sourceOpportunityId!))];
  const picks = await db
    .select()
    .from(trackPicks)
    .where(and(inArray(trackPicks.id, ids), inArray(trackPicks.status, ["won", "lost", "void"])))
    .all();
  const byId = new Map(picks.map((p) => [p.id, p]));
  if (!byId.size) return 0;

  const owners = new Map((await loadUsers()).map((u) => [u.id, u]));
  let created = 0;
  for (const b of open) {
    const pick = byId.get(b.sourceOpportunityId!);
    if (!pick) continue;
    const status = pick.status as "won" | "lost" | "void";
    const payout = status === "won" ? b.stake * b.odds : status === "void" ? b.stake : 0;
    const profit = Number((payout - b.stake).toFixed(2));
    await db
      .update(bets)
      .set({
        status,
        payout: Number(payout.toFixed(2)),
        profit,
        settledAt: pick.settledAt ?? new Date().toISOString(),
        closingOdds: pick.closingOdds,
        clvPercent: Number((closingLineValue(b.odds, pick.closingOdds) * 100).toFixed(2)),
      })
      .where(eq(bets.id, b.id));

    const owner = owners.get(b.userId);
    if (!owner) continue;
    const kind: NotificationKind = status === "won" ? "bet-won" : status === "lost" ? "bet-lost" : "system";
    const title =
      status === "void"
        ? "Spil annulleret · indsatsen er tilbage"
        : `${status === "won" ? "Vundet" : "Tabt"} · ${signedKr(profit)}`;
    if (await notify(owner, kind, title, `${b.event}: ${b.selection}. Odds ${formatOdds(b.odds)}.`, "/portfolio", `result:${b.id}`)) {
      created++;
    }
  }
  return created;
}

/** New value bets in the user's own books, above their alert threshold. One message per run. */
async function valueAlerts(user: UserRow, opps: ValueOpportunity[]): Promise<boolean> {
  const s = user.settings;
  const now = Date.now();
  const mine = opps
    .filter((o) => new Date(o.startsAt).getTime() > now)
    .map((o) => restrictOpportunityToBooks(o, s.activeBookmakerIds))
    .filter((o): o is ValueOpportunity => o !== null)
    .filter(
      (o) =>
        o.expectedValue >= Math.max(s.minEdge, s.alertMinEdge) &&
        oddsAllowed(o.bestOdds, s.minOdds, s.maxOdds),
    );

  const seenRows = await db.select().from(notifySeen).where(eq(notifySeen.userId, user.id)).all();
  const seen = new Set(seenRows.map((r) => r.key));
  const fresh = mine.filter((o) => !seen.has(`v:${o.id}`));
  const markSeen = async (keys: string[]) => {
    for (let i = 0; i < keys.length; i += 200) {
      await db
        .insert(notifySeen)
        .values(keys.slice(i, i + 200).map((key) => ({ userId: user.id, key })))
        .onConflictDoNothing();
    }
  };

  // First run for this user: learn what's already there instead of announcing all of it.
  if (!seen.has("primed")) {
    await markSeen(["primed", ...mine.map((o) => `v:${o.id}`)]);
    return false;
  }
  if (!fresh.length) return false;
  await markSeen(fresh.map((o) => `v:${o.id}`));
  if (!s.valueAlerts) return false;

  fresh.sort((a, b) => b.edgePercent - a.edgePercent);
  const best = fresh[0];
  const detail = `${best.homeTeam} – ${best.awayTeam}: ${best.selection} hos ${bookName(best.bestBookmakerId)} til ${formatOdds(best.bestOdds)}.`;
  const title =
    fresh.length === 1
      ? `Nyt value bet · ${formatPercent(best.expectedValue, { signed: true, digits: 1 })} EV`
      : `${fresh.length} nye value bets · bedste ${formatPercent(best.expectedValue, { signed: true, digits: 1 })} EV`;
  return notify(user, "value-alert", title, detail, "/value-bets", `value:${best.id}:${fresh.length}`);
}

/** The price on a bet the user is following has moved ≥ 5% since they took it. */
async function priceMoveAlerts(user: UserRow, opps: ValueOpportunity[]): Promise<number> {
  if (!user.settings.priceMoveAlerts) return 0;
  const mine = await db
    .select()
    .from(bets)
    .where(and(eq(bets.userId, user.id), eq(bets.status, "pending"), isNotNull(bets.sourceOpportunityId)))
    .all();
  const byId = new Map(opps.map((o) => [o.id, o]));
  let created = 0;
  for (const b of mine) {
    const opp = byId.get(b.sourceOpportunityId!);
    const quote = opp?.quotes.find((q) => q.bookmakerId === b.bookmakerId);
    if (!opp || !quote) continue;
    const change = quote.price / b.odds - 1;
    if (Math.abs(change) < 0.05) continue;
    const down = change < 0;
    const title = down ? "Odds falder på dit spil" : "Odds stiger på dit spil";
    const body = `${b.selection} hos ${bookName(b.bookmakerId)}: ${formatOdds(b.odds)} → ${formatOdds(quote.price)}. ${
      down ? "Du fik den bedre pris." : "Markedet giver mere nu."
    }`;
    if (await notify(user, "price-move", title, body, "/value-bets", `move:${b.id}:${down ? "d" : "u"}`)) created++;
  }
  return created;
}

const isoWeek = (d: Date) => {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((+t - +yearStart) / 86_400_000 + 1) / 7)).padStart(2, "0")}`;
};

/** Mondays from 08:00 Danish time: last week's settled bets in one message. */
async function weeklyReport(user: UserRow, now: Date): Promise<boolean> {
  if (!user.settings.weeklyReport) return false;
  if (now.getUTCDay() !== 1 || now.getUTCHours() < 6) return false;
  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const rows = await db
    .select()
    .from(bets)
    .where(and(eq(bets.userId, user.id), gte(bets.settledAt, since)))
    .all();
  const done = rows.filter((b) => b.status === "won" || b.status === "lost");
  if (!done.length) return false;
  const profit = done.reduce((s, b) => s + b.profit, 0);
  const staked = done.reduce((s, b) => s + b.stake, 0);
  const won = done.filter((b) => b.status === "won").length;
  const roi = staked ? profit / staked : 0;
  return notify(
    user,
    "report",
    `Din uge: ${formatPercent(roi, { signed: true, digits: 1 })} ROI`,
    `${done.length} afgjorte spil, ${won} vundet · ${signedKr(profit)}. Se hele rapporten.`,
    "/portfolio",
    `weekly:${isoWeek(now)}`,
  );
}

/** Run every generator for every user. Safe to call as often as you like. */
export async function runNotificationJob(opps: ValueOpportunity[]): Promise<{ created: number }> {
  await dbReady;
  const now = new Date();
  let created = await settleUserBets();
  for (const user of await loadUsers()) {
    try {
      if (await valueAlerts(user, opps)) created++;
      created += await priceMoveAlerts(user, opps);
      if (await weeklyReport(user, now)) created++;
    } catch (err) {
      console.error("[notify] failed for a user:", err);
    }
  }
  return { created };
}
