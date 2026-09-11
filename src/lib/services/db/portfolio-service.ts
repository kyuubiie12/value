import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Bet, NewBetInput } from "@/types";
import { MARKET_LABELS } from "@/types";
import {
  computeBreakdown,
  computeEquityCurve,
  computePortfolioStats,
  DEFAULT_SETTINGS,
} from "@/lib/mock-data";
import { closingLineValue } from "@/lib/betting-math";
import { filterBets } from "@/lib/filtering";
import { db, dbReady } from "@/lib/db";
import {
  autoFollowDismissed,
  bets as betsTable,
  userSettings,
} from "@/lib/db/schema";
import type { BetRow } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth/session";
import type { PortfolioService } from "../types";

function payoutFor(bet: Pick<Bet, "status" | "stake" | "odds">): number {
  switch (bet.status) {
    case "won":
      return bet.stake * bet.odds;
    case "half-won":
      return bet.stake * (1 + (bet.odds - 1) / 2);
    case "half-lost":
      return bet.stake / 2;
    case "void":
      return bet.stake;
    case "lost":
    default:
      return 0;
  }
}

function toBet(r: BetRow): Bet {
  return {
    id: r.id,
    placedAt: r.placedAt,
    settledAt: r.settledAt ?? undefined,
    leagueId: r.leagueId,
    league: r.league,
    event: r.event,
    eventStartsAt: r.eventStartsAt ?? undefined,
    market: r.market as Bet["market"],
    marketLabel: r.marketLabel,
    selection: r.selection,
    bookmakerId: r.bookmakerId,
    odds: r.odds,
    stake: r.stake,
    stakeUnits: r.stakeUnits,
    status: r.status as Bet["status"],
    payout: r.payout,
    profit: r.profit,
    closingOdds: r.closingOdds ?? undefined,
    clvPercent: r.clvPercent ?? undefined,
    expectedValue: r.expectedValue ?? undefined,
    notes: r.notes ?? undefined,
    sourceOpportunityId: r.sourceOpportunityId ?? undefined,
    tags: r.tags ?? undefined,
  };
}

async function startingBankrollFor(userId: string): Promise<number> {
  const row = await db
    .select({ data: userSettings.data })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .get();
  const value = row?.data?.startingBankroll;
  return typeof value === "number" ? value : DEFAULT_SETTINGS.startingBankroll;
}

async function loadBets(userId: string): Promise<Bet[]> {
  const rows = await db
    .select()
    .from(betsTable)
    .where(eq(betsTable.userId, userId))
    .all();
  return rows
    .map(toBet)
    .sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt));
}

export function createDbPortfolioService(): PortfolioService {
  return {
    async getStats() {
      await dbReady;
      const userId = await requireUserId();
      const [bets, bankroll] = await Promise.all([
        loadBets(userId),
        startingBankrollFor(userId),
      ]);
      return computePortfolioStats(bets, bankroll);
    },

    async getEquityCurve() {
      await dbReady;
      const userId = await requireUserId();
      const [bets, bankroll] = await Promise.all([
        loadBets(userId),
        startingBankrollFor(userId),
      ]);
      return computeEquityCurve(bets, bankroll);
    },

    async listBets(filters) {
      await dbReady;
      const userId = await requireUserId();
      return filterBets(await loadBets(userId), filters);
    },

    async getBet(id) {
      await dbReady;
      const userId = await requireUserId();
      const row = await db
        .select()
        .from(betsTable)
        .where(and(eq(betsTable.id, id), eq(betsTable.userId, userId)))
        .get();
      return row ? toBet(row) : null;
    },

    async addBet(input: NewBetInput) {
      await dbReady;
      const userId = await requireUserId();

      const placedAt = input.placedAt ?? new Date().toISOString();
      const status = input.status ?? "pending";
      const stakeUnits = Number(
        (input.stake / DEFAULT_SETTINGS.unitSize).toFixed(2),
      );
      const payout =
        status === "pending"
          ? 0
          : payoutFor({ status, stake: input.stake, odds: input.odds });

      const bet: Bet = {
        id: randomUUID(),
        placedAt,
        settledAt: status === "pending" ? undefined : new Date().toISOString(),
        leagueId: input.leagueId,
        league: input.league,
        event: input.event,
        eventStartsAt: input.eventStartsAt,
        market: input.market,
        marketLabel: input.marketLabel ?? MARKET_LABELS[input.market],
        selection: input.selection,
        bookmakerId: input.bookmakerId,
        odds: input.odds,
        stake: input.stake,
        stakeUnits,
        status,
        payout: Number(payout.toFixed(2)),
        profit: Number((payout - input.stake).toFixed(2)),
        expectedValue: input.expectedValue,
        notes: input.notes,
        sourceOpportunityId: input.sourceOpportunityId,
        tags: input.tags,
      };

      await db.insert(betsTable).values({
        id: bet.id,
        userId,
        placedAt: bet.placedAt,
        settledAt: bet.settledAt ?? null,
        leagueId: bet.leagueId,
        league: bet.league,
        event: bet.event,
        eventStartsAt: bet.eventStartsAt ?? null,
        market: bet.market,
        marketLabel: bet.marketLabel,
        selection: bet.selection,
        bookmakerId: bet.bookmakerId,
        odds: bet.odds,
        stake: bet.stake,
        stakeUnits: bet.stakeUnits,
        status: bet.status,
        payout: bet.payout,
        profit: bet.profit,
        closingOdds: null,
        clvPercent: null,
        expectedValue: bet.expectedValue ?? null,
        notes: bet.notes ?? null,
        sourceOpportunityId: bet.sourceOpportunityId ?? null,
        tags: bet.tags ?? null,
      });

      return bet;
    },

    async removeBet(id) {
      await dbReady;
      const userId = await requireUserId();
      const row = await db
        .select()
        .from(betsTable)
        .where(and(eq(betsTable.id, id), eq(betsTable.userId, userId)))
        .get();
      if (!row) return;

      if (row.tags?.includes("auto-follow") && row.sourceOpportunityId) {
        await db
          .insert(autoFollowDismissed)
          .values({ userId, opportunityId: row.sourceOpportunityId })
          .onConflictDoNothing();
      }
      await db
        .delete(betsTable)
        .where(and(eq(betsTable.id, id), eq(betsTable.userId, userId)));
    },

    async listAutoFollowDismissed() {
      await dbReady;
      const userId = await requireUserId();
      const rows = await db
        .select({ opportunityId: autoFollowDismissed.opportunityId })
        .from(autoFollowDismissed)
        .where(eq(autoFollowDismissed.userId, userId))
        .all();
      return rows.map((r) => r.opportunityId);
    },

    async updateBet(id, patch) {
      await dbReady;
      const userId = await requireUserId();
      const row = await db
        .select()
        .from(betsTable)
        .where(and(eq(betsTable.id, id), eq(betsTable.userId, userId)))
        .get();
      if (!row) throw new Error(`Bet ${id} not found`);

      const next = { ...toBet(row), ...patch };

      if (patch.status && patch.status !== "pending") {
        next.payout = Number(payoutFor(next).toFixed(2));
        next.profit = Number((next.payout - next.stake).toFixed(2));
        next.settledAt = next.settledAt ?? new Date().toISOString();
        if (next.closingOdds) {
          next.clvPercent = Number(
            (closingLineValue(next.odds, next.closingOdds) * 100).toFixed(2),
          );
        }
      }

      await db
        .update(betsTable)
        .set({
          placedAt: next.placedAt,
          settledAt: next.settledAt ?? null,
          status: next.status,
          odds: next.odds,
          stake: next.stake,
          stakeUnits: next.stakeUnits,
          payout: next.payout,
          profit: next.profit,
          closingOdds: next.closingOdds ?? null,
          clvPercent: next.clvPercent ?? null,
          expectedValue: next.expectedValue ?? null,
          notes: next.notes ?? null,
          tags: next.tags ?? null,
        })
        .where(and(eq(betsTable.id, id), eq(betsTable.userId, userId)));

      return next;
    },

    async getBreakdown(dimension) {
      await dbReady;
      const userId = await requireUserId();
      return computeBreakdown(dimension, await loadBets(userId));
    },
  };
}
