"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  AccentColor,
  CornerStyle,
  Currency,
  DisplayFont,
  GlowLevel,
  MarketType,
  NewBetInput,
  SurfaceTone,
  ThemeMode,
  UserSettings,
} from "@/types";
import { DEFAULT_SETTINGS } from "@/lib/mock-data";
import { APPEARANCE_DEFAULTS, sanitizeAppearance } from "@/lib/appearance";
import { suggestedStake } from "@/lib/betting-math";
import { restrictOpportunityToBooks } from "@/lib/restrict-opportunity";
import {
  bookmakerService,
  insightService,
  leagueService,
  notificationService,
  portfolioService,
  settingsService,
  trackRecordService,
  valueService,
} from "@/lib/services";

/** Log a bet to the tracker. Called from the "Log til Portfolio" modal. */
export async function logBetAction(input: NewBetInput) {
  const bet = await portfolioService.addBet(input);
  if (input.sourceOpportunityId) {
    await valueService.markRead(input.sourceOpportunityId).catch(() => {});
  }
  revalidatePath("/portfolio");
  revalidatePath("/value-bets");
  return bet;
}

/** Mark a value opportunity as read (dismiss the alert). */
export async function markOpportunityReadAction(id: string) {
  await valueService.markRead(id);
  revalidatePath("/value-bets");
}

/** AI analysis for one opportunity — called when the detail drawer opens. */
export async function analyseOpportunityAction(id: string) {
  const opportunity = await valueService.getOpportunity(id);
  if (!opportunity) return null;
  const [insight, marketPerformance] = await Promise.all([
    insightService.analyse(opportunity),
    trackRecordService.getMarketPerformance(opportunity.market),
  ]);
  return { insight, marketPerformance };
}

/** Historical track-record performance for one market — social proof on a pick. */
export async function getMarketPerformanceAction(market: MarketType) {
  return trackRecordService.getMarketPerformance(market);
}

/**
 * "Jeg spiller med" — one-click log of a value opportunity to the portfolio at
 * the best price and the recommended stake, as an open (pending) bet.
 */
export async function trackOpportunityAction(id: string, stake: number) {
  const o = await valueService.getOpportunity(id);
  if (!o) return null;

  const bet = await portfolioService.addBet({
    leagueId: o.leagueId,
    league: o.league,
    event: `${o.homeTeam} – ${o.awayTeam}`,
    eventStartsAt: o.startsAt,
    market: o.market,
    marketLabel: o.marketLabel,
    selection: o.selection,
    bookmakerId: o.bestBookmakerId,
    odds: o.bestOdds,
    stake: Math.max(0, Math.round(stake)),
    status: "pending",
    expectedValue: o.expectedValue,
    sourceOpportunityId: o.id,
    tags: ["ai-feed", "auto"],
  });

  await valueService.markRead(id).catch(() => {});
  revalidatePath("/portfolio");
  revalidatePath("/value-bets");
  revalidatePath("/", "layout");
  return bet;
}

/** Never log more than this in one sync — a guard against flooding the portfolio. */
const AUTO_FOLLOW_MAX_PER_SYNC = 6;

/**
 * Auto-follow: log the strongest current value bets to the portfolio as open
 * bets, at the best price and the recommended Kelly stake. Rules that keep it
 * sensible:
 *  - only picks at or above the user's auto-follow EV threshold;
 *  - only at the user's own bookmakers (EV recomputed for that book set);
 *  - never a match that has already kicked off;
 *  - never one already followed, nor one the user removed after an earlier sync;
 *  - best edge first, stopping at the weekly staking limit;
 *  - at most {@link AUTO_FOLLOW_MAX_PER_SYNC} per run.
 * Idempotent — safe to call on every feed visit.
 */
export async function syncAutoFollowAction(): Promise<{
  added: number;
  stoppedByLimit: boolean;
}> {
  const settings = await settingsService.get();
  if (!settings.autoFollow) return { added: 0, stoppedByLimit: false };

  const [raw, bets, stats, dismissed] = await Promise.all([
    valueService.listOpportunities(),
    portfolioService.listBets(),
    portfolioService.getStats(),
    portfolioService.listAutoFollowDismissed(),
  ]);

  const skip = new Set<string | undefined>([
    ...bets
      .filter((b) => b.sourceOpportunityId)
      .map((b) => b.sourceOpportunityId),
    ...dismissed,
  ]);

  const now = Date.now();
  const weekAgo = now - 7 * 86_400_000;
  let weekStaked = bets
    .filter((b) => new Date(b.placedAt).getTime() >= weekAgo)
    .reduce((s, b) => s + b.stake, 0);
  const weekLimit = settings.weeklyStakeLimit;

  const candidates = raw
    .map((o) => restrictOpportunityToBooks(o, settings.activeBookmakerIds))
    .filter((o): o is NonNullable<typeof o> => o !== null)
    .filter(
      (o) =>
        o.expectedValue >= settings.autoFollowMinEdge &&
        !skip.has(o.id) &&
        new Date(o.startsAt).getTime() > now,
    )
    .sort((a, b) => b.edgePercent - a.edgePercent);

  let added = 0;
  let stoppedByLimit = false;

  for (const o of candidates) {
    if (added >= AUTO_FOLLOW_MAX_PER_SYNC) break;
    const stake = suggestedStake(
      o.kellyFraction,
      settings.kellyFraction,
      stats.bankroll,
      settings.stakeRounding,
    );
    if (stake <= 0) continue;
    if (weekLimit > 0 && weekStaked + stake > weekLimit) {
      stoppedByLimit = true;
      break;
    }
    await portfolioService.addBet({
      leagueId: o.leagueId,
      league: o.league,
      event: `${o.homeTeam} – ${o.awayTeam}`,
      eventStartsAt: o.startsAt,
      market: o.market,
      marketLabel: o.marketLabel,
      selection: o.selection,
      bookmakerId: o.bestBookmakerId,
      odds: o.bestOdds,
      stake,
      status: "pending",
      expectedValue: o.expectedValue,
      sourceOpportunityId: o.id,
      tags: ["ai-feed", "auto-follow"],
    });
    await valueService.markRead(o.id).catch(() => {});
    weekStaked += stake;
    added += 1;
  }

  if (added > 0) {
    revalidatePath("/portfolio");
    revalidatePath("/value-bets");
    revalidatePath("/", "layout");
  }
  return { added, stoppedByLimit };
}

/** Undo a "jeg spiller med" — removes the still-open bet(s) from that opportunity. */
export async function untrackOpportunityAction(id: string) {
  const bets = await portfolioService.listBets();
  const open = bets.filter(
    (b) => b.sourceOpportunityId === id && b.status === "pending",
  );
  await Promise.all(open.map((b) => portfolioService.removeBet(b.id)));
  revalidatePath("/portfolio");
  revalidatePath("/value-bets");
  revalidatePath("/", "layout");
}

/** Change the staked amount on an already-tracked ("jeg spiller med") opportunity. */
export async function updateTrackedStakeAction(id: string, stake: number) {
  const amount = Math.max(0, Math.round(stake));
  const bets = await portfolioService.listBets();
  const open = bets.filter(
    (b) => b.sourceOpportunityId === id && b.status === "pending",
  );
  await Promise.all(
    open.map((b) =>
      portfolioService.updateBet(b.id, {
        stake: amount,
        stakeUnits: Number((amount / DEFAULT_SETTINGS.unitSize).toFixed(2)),
      }),
    ),
  );
  revalidatePath("/portfolio");
  revalidatePath("/value-bets");
  revalidatePath("/", "layout");
}

/** Settle an open bet — win / loss / void — from the portfolio. */
export async function settleBetAction(id: string, status: "won" | "lost" | "void") {
  await portfolioService.updateBet(id, { status });
  revalidatePath("/portfolio");
  revalidatePath("/value-bets");
  revalidatePath("/", "layout");
}

/** Re-open a bet that was settled by mistake. */
export async function reopenBetAction(id: string) {
  await portfolioService.updateBet(id, {
    status: "pending",
    payout: 0,
    profit: 0,
    settledAt: undefined,
  });
  revalidatePath("/portfolio");
  revalidatePath("/", "layout");
}

/** Persist profile / settings changes. */
export async function updateSettingsAction(patch: Partial<UserSettings>) {
  // Appearance values come from the client — never store anything off-list.
  const safe: Partial<UserSettings> = { ...patch };
  const a = sanitizeAppearance(patch);
  for (const k of Object.keys(APPEARANCE_DEFAULTS) as (keyof typeof APPEARANCE_DEFAULTS)[]) {
    if (k in patch) (safe as Record<string, unknown>)[k] = a[k];
  }
  const next = await settingsService.update(safe);
  revalidatePath("/", "layout");
  return next;
}

// Map onto the same Kelly fractions the profile's "Kelly-fraktion" select offers,
// so the choice shows up correctly there afterwards.
const RISK_KELLY: Record<string, number> = {
  cautious: 0.1,
  balanced: 0.25,
  aggressive: 0.5,
};

export interface OnboardingInput {
  bankroll: number;
  currency: Currency;
  bookmakerIds: string[];
  leagueIds: string[];
  risk: "cautious" | "balanced" | "aggressive";
  autoFollow: boolean;
  autoFollowMinEdge: number; // fraction
  notifications: {
    valueAlerts: boolean;
    priceMoveAlerts: boolean;
    betResultAlerts: boolean;
    weeklyReport: boolean;
  };
  theme: ThemeMode;
  accent: AccentColor;
  displayFont: DisplayFont;
  surface?: SurfaceTone;
  corners?: CornerStyle;
  glow?: GlowLevel;
  animations?: boolean;
}


/** Finish the welcome wizard — writes the first real settings and opens the app. */
export async function completeOnboardingAction(input: OnboardingInput) {
  const [allBooks, allLeagues] = await Promise.all([
    bookmakerService.list(),
    leagueService.list(),
  ]);
  const bookIds = new Set(allBooks.map((b) => b.id));
  const leagueIds = new Set(allLeagues.map((l) => l.id));

  const currency: Currency = ["DKK", "EUR", "USD"].includes(input.currency)
    ? input.currency
    : "DKK";
  const bankroll = Math.min(
    100_000_000,
    Math.max(100, Math.round(input.bankroll || 0)),
  );
  // Keep "1 unit ≈ 1% of bankroll", rounded to a tidy number.
  const unitSize = Math.max(10, Math.round(bankroll / 100 / 10) * 10);
  const kellyFraction = RISK_KELLY[input.risk] ?? DEFAULT_SETTINGS.kellyFraction;
  const autoFollowMinEdge = Math.min(
    0.5,
    Math.max(0, Number(input.autoFollowMinEdge) || DEFAULT_SETTINGS.autoFollowMinEdge),
  );
  const n = input.notifications ?? DEFAULT_SETTINGS;

  await settingsService.update({
    startingBankroll: bankroll,
    currency,
    unitSize,
    kellyFraction,
    activeBookmakerIds: input.bookmakerIds.filter((id) => bookIds.has(id)),
    favoriteLeagueIds: input.leagueIds.filter((id) => leagueIds.has(id)),
    autoFollow: !!input.autoFollow,
    autoFollowMinEdge,
    valueAlerts: !!n.valueAlerts,
    priceMoveAlerts: !!n.priceMoveAlerts,
    betResultAlerts: !!n.betResultAlerts,
    weeklyReport: !!n.weeklyReport,
    ...sanitizeAppearance(input),
    onboardingComplete: true,
  });

  revalidatePath("/", "layout");
  redirect("/value-bets");
}

/** Reset every preference to the defaults (keeps identity + plan). */
export async function resetSettingsAction() {
  const current = await settingsService.get();
  const next = await settingsService.update({
    ...DEFAULT_SETTINGS,
    displayName: current.displayName,
    email: current.email,
    memberSince: current.memberSince,
    plan: current.plan,
  });
  revalidatePath("/", "layout");
  return next;
}

export async function markNotificationReadAction(id: string) {
  await notificationService.markRead(id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  await notificationService.markAllRead();
  revalidatePath("/", "layout");
}
