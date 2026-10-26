import type { ValueOpportunity } from "@/types";
import { expectedValue, kellyStake } from "./betting-math";

/**
 * Recompute an opportunity as if only the given bookmakers were available:
 * best odds / best book / EV / Kelly are derived from those quotes only.
 * Returns null if none of the user's books priced the selection.
 */
export function restrictOpportunityToBooks(
  o: ValueOpportunity,
  bookmakerIds: string[] | undefined,
): ValueOpportunity | null {
  if (!bookmakerIds?.length) return o;

  const allowed = o.quotes.filter((q) => bookmakerIds.includes(q.bookmakerId));
  if (!allowed.length) return null;

  const best = allowed.reduce((a, b) => (b.price > a.price ? b : a));
  const prices = allowed.map((q) => q.price);
  const averageOdds = prices.reduce((a, b) => a + b, 0) / prices.length;
  const ev = expectedValue(best.price, o.fairProbability);

  if (ev <= 0) return null;

  return {
    ...o,
    quotes: allowed,
    ...(o.unconfirmed ? { unconfirmed: o.unconfirmed.filter((q) => bookmakerIds.includes(q.bookmakerId)) } : {}),
    booksCount: allowed.length,
    bestOdds: best.price,
    bestBookmakerId: best.bookmakerId,
    averageOdds: Number(averageOdds.toFixed(3)),
    expectedValue: Number(ev.toFixed(4)),
    edgePercent: Number((ev * 100).toFixed(2)),
    kellyFraction: Number(kellyStake(best.price, o.fairProbability, 1).toFixed(4)),
  };
}
