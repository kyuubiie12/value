import type { PlayerStatContext } from "@/types";
import type { NicheCategory } from "./niche";
import { lineFromLabel, METRIC, poissonAtLeast, type PlayerSeasonStats } from "./player-model";
import type { PlayerMatchStat } from "@/lib/track/grade";

/**
 * "Proven" player-prop value, built from what the player actually did in his
 * last matches — pure. A prop counts only if his own record clears the price
 * even on a pessimistic reading, not just on the average.
 */

/** One appearance: how many times he did the thing, most recent match first. */
export interface Appearance {
  fixtureId: number;
  date: string;
  stat: PlayerMatchStat;
}

/** Fewer matches than this and a hit rate says nothing. */
export const MIN_MATCHES = 8;
/** Matches looked back over. */
export const HISTORY_MATCHES = 10;
/** One-sided confidence for the pessimistic estimate (z = 0.84 ≈ 80%). */
const Z = 0.84;
/** The pessimistic edge a prop must clear to be shown at all. */
export const MIN_PROVEN_EV = 0.03;
/**
 * A "proven" edge this large means the market knows something his record doesn't
 * (an opponent, a rest day, a new role) — it is not a bargain, so it is dropped.
 */
export const MAX_PROVEN_EV = 0.4;

/** Wilson score lower bound for hits/n — "at least this often, give or take luck". */
export function wilsonLower(hits: number, n: number, z = Z): number {
  if (n <= 0) return 0;
  const p = hits / n;
  const z2 = z * z;
  const centre = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return Math.max(0, (centre - margin) / (1 + z2 / n));
}

export const countOf = (s: PlayerMatchStat, cat: NicheCategory): number =>
  ({ shots: s.shots, "shots-on-target": s.shotsOn, tackles: s.tackles, fouls: s.fouls, saves: s.saves, cards: s.cards })[cat];

/**
 * His record for one prop: counts per match, hit rate, the pessimistic chance,
 * and a Poisson cross-check from his average. Null when there's too little data
 * or the label isn't an "N+" line.
 */
export function historyContext(
  category: NicheCategory,
  label: string,
  appearances: Appearance[],
  displayName: string,
  season: number,
): PlayerStatContext | null {
  const line = lineFromLabel(label);
  // Only matches he actually played in (a bench-warmer's zeros would flatter nothing).
  const played = appearances.filter((a) => (a.stat.minutes ?? 0) > 0).slice(0, HISTORY_MATCHES);
  if (line === null || played.length < MIN_MATCHES) return null;

  const counts = played.map((a) => countOf(a.stat, category));
  const hits = counts.filter((c) => c >= line).length;
  const n = counts.length;
  const mean = counts.reduce((s, c) => s + c, 0) / n;
  const lower = wilsonLower(hits, n);
  const poisson = poissonAtLeast(mean, line);
  const total = counts.reduce((s, c) => s + c, 0);

  return {
    player: displayName,
    season,
    metric: METRIC[category].label,
    games: n,
    total,
    perGame: Number(mean.toFixed(2)),
    line,
    // The probability we price against: the pessimistic one.
    modelProbability: Number(lower.toFixed(4)),
    modelFairOdds: lower > 0 ? Number((1 / lower).toFixed(3)) : 0,
    history: { counts, hits, n, hitRate: Number((hits / n).toFixed(4)), poisson: Number(poisson.toFixed(4)) },
  };
}

/**
 * Does his record prove the price is too big? All of: the pessimistic chance beats
 * the break-even rate, the average-based chance agrees, and the raw hit rate is
 * clearly (10%) above break-even.
 */
export function isProven(ctx: PlayerStatContext, bestOdds: number): boolean {
  const h = ctx.history;
  if (!h) return false;
  const breakEven = 1 / bestOdds;
  return (
    ctx.modelProbability > breakEven &&
    h.poisson >= breakEven &&
    h.hitRate >= breakEven * 1.1 &&
    bestOdds * ctx.modelProbability - 1 >= MIN_PROVEN_EV &&
    bestOdds * ctx.modelProbability - 1 <= MAX_PROVEN_EV
  );
}

/** Build a name-searchable roster out of players seen in recent matches (ids + API names). */
export function rosterFromHistory(players: { id: number; name: string }[]): PlayerSeasonStats[] {
  const seen = new Map<number, PlayerSeasonStats>();
  for (const p of players) {
    if (seen.has(p.id)) continue;
    seen.set(p.id, {
      id: p.id, first: "", last: "", name: p.name, position: "", apps: 0, minutes: 0,
      fouls: 0, tackles: 0, shots: 0, shotsOn: 0, cards: 0, saves: 0,
    });
  }
  return [...seen.values()];
}
