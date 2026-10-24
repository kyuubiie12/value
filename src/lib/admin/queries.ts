import "server-only";
import { desc, eq, max, sql } from "drizzle-orm";
import type { Bet, UserSettings } from "@/types";
import { db, dbReady } from "@/lib/db";
import { bets, sessions, userSettings, users } from "@/lib/db/schema";
import { DEFAULT_SETTINGS } from "@/lib/mock-data";
import { requireAdmin } from "@/lib/auth/admin";

/**
 * Read-only admin queries. Every export starts with `requireAdmin()` so a page
 * can never forget the check. Never selects `password_hash`.
 */

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  createdAt: string; // ISO
  /** Most recent login, ISO — null if unknown (account predates login tracking). */
  lastSeenAt: string | null;
  activeSessions: number;
  onboarded: boolean;
  plan: UserSettings["plan"];
  currency: UserSettings["currency"];
  startingBankroll: number;
  bookmakers: number;
  bets: number;
  openBets: number;
  staked: number;
  profit: number;
  lastBetAt: string | null;
}

export interface AdminOverview {
  totalUsers: number;
  new7d: number;
  new30d: number;
  onboardedPct: number;
  withBetsPct: number;
  active7d: number;
  activeNow: number;
  totalBets: number;
  totalStaked: number;
  signupsByDay: { date: string; count: number }[];
  plans: { key: string; count: number }[];
  currencies: { key: string; count: number }[];
  topBookmakers: { id: string; count: number }[];
  topLeagues: { id: string; count: number }[];
  users: AdminUserRow[];
}

const DAY = 86_400_000;

function tally(items: string[]): { id: string; count: number }[] {
  const m = new Map<string, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  await requireAdmin();
  await dbReady;

  const [userRows, settingsRows, betAgg, sessionAgg] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.displayName,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt)),
    db.select().from(userSettings),
    db
      .select({
        userId: bets.userId,
        n: sql<number>`count(*)`,
        open: sql<number>`sum(case when ${bets.status} = 'pending' then 1 else 0 end)`,
        staked: sql<number>`coalesce(sum(${bets.stake}), 0)`,
        profit: sql<number>`coalesce(sum(${bets.profit}), 0)`,
        last: max(bets.placedAt),
      })
      .from(bets)
      .groupBy(bets.userId),
    db
      .select({
        userId: sessions.userId,
        last: max(sessions.createdAt),
        active: sql<number>`sum(case when ${sessions.expiresAt} > ${Date.now()} then 1 else 0 end)`,
      })
      .from(sessions)
      .groupBy(sessions.userId),
  ]);

  const settingsByUser = new Map(
    settingsRows.map((r) => [r.userId, { ...DEFAULT_SETTINGS, ...r.data } as UserSettings]),
  );
  const betsByUser = new Map(betAgg.map((r) => [r.userId, r]));
  const sessionsByUser = new Map(sessionAgg.map((r) => [r.userId, r]));
  const now = Date.now();

  const rows: AdminUserRow[] = userRows.map((u) => {
    const s = settingsByUser.get(u.id) ?? DEFAULT_SETTINGS;
    const b = betsByUser.get(u.id);
    const sess = sessionsByUser.get(u.id);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      // Prefer the stamped last login; fall back to the newest surviving session
      // for accounts that predate the column.
      lastSeenAt:
        u.lastLoginAt ?? (sess?.last ? new Date(Number(sess.last)).toISOString() : null),
      activeSessions: Number(sess?.active ?? 0),
      onboarded: s.onboardingComplete !== false,
      plan: s.plan,
      currency: s.currency,
      startingBankroll: s.startingBankroll,
      bookmakers: s.activeBookmakerIds.length,
      bets: Number(b?.n ?? 0),
      openBets: Number(b?.open ?? 0),
      staked: Number(b?.staked ?? 0),
      profit: Number(b?.profit ?? 0),
      lastBetAt: b?.last ?? null,
    };
  });

  const total = rows.length;
  const created = (r: AdminUserRow) => new Date(r.createdAt).getTime();

  // Signups per calendar day, last 30 days (oldest → newest, zero-filled).
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(start.getTime() - (29 - i) * DAY);
    return { key: d.toDateString(), date: d.toISOString(), count: 0 };
  });
  for (const r of rows) {
    const k = new Date(r.createdAt).toDateString();
    const hit = days.find((d) => d.key === k);
    if (hit) hit.count += 1;
  }

  const settingsList = userRows.map((u) => settingsByUser.get(u.id) ?? DEFAULT_SETTINGS);

  return {
    totalUsers: total,
    new7d: rows.filter((r) => now - created(r) < 7 * DAY).length,
    new30d: rows.filter((r) => now - created(r) < 30 * DAY).length,
    onboardedPct: total ? rows.filter((r) => r.onboarded).length / total : 0,
    withBetsPct: total ? rows.filter((r) => r.bets > 0).length / total : 0,
    active7d: rows.filter(
      (r) => r.lastSeenAt && now - new Date(r.lastSeenAt).getTime() < 7 * DAY,
    ).length,
    activeNow: rows.filter((r) => r.activeSessions > 0).length,
    totalBets: rows.reduce((a, r) => a + r.bets, 0),
    totalStaked: rows.reduce((a, r) => a + r.staked, 0),
    signupsByDay: days.map(({ date, count }) => ({ date, count })),
    plans: tally(rows.map((r) => r.plan)).map(({ id, count }) => ({ key: id, count })),
    currencies: tally(rows.map((r) => r.currency)).map(({ id, count }) => ({
      key: id,
      count,
    })),
    topBookmakers: tally(settingsList.flatMap((s) => s.activeBookmakerIds)),
    topLeagues: tally(settingsList.flatMap((s) => s.favoriteLeagueIds)),
    users: rows,
  };
}

export interface AdminUserDetail {
  row: AdminUserRow;
  settings: UserSettings;
  bets: Bet[];
}

export async function getAdminUser(id: string): Promise<AdminUserDetail | null> {
  await requireAdmin();
  const overview = await getAdminOverview();
  const row = overview.users.find((u) => u.id === id);
  if (!row) return null;

  const [settingsRow, betRows] = await Promise.all([
    db.select().from(userSettings).where(eq(userSettings.userId, id)).get(),
    db.select().from(bets).where(eq(bets.userId, id)).orderBy(desc(bets.placedAt)).limit(100),
  ]);

  return {
    row,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(settingsRow?.data ?? {}),
      displayName: row.name,
      email: row.email,
      memberSince: row.createdAt,
    } as UserSettings,
    bets: betRows as unknown as Bet[],
  };
}
