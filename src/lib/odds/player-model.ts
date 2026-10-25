import type { PlayerStatContext } from "@/types";
import type { NicheCategory } from "./niche";

/**
 * Turns a player's season record into the chance of a prop landing — pure.
 * The model is deliberately plain: take the per-game rate, assume the count in
 * one match is Poisson-distributed, and read off P(count ≥ line). It ignores the
 * opponent and minutes, so it is a sanity check on the price, not a forecast.
 */

export interface PlayerSeasonStats {
  id: number;
  first: string;
  last: string;
  name: string;
  position: string;
  apps: number;
  minutes: number;
  fouls: number;
  tackles: number;
  shots: number;
  shotsOn: number;
  /** Yellow + red cards. */
  cards: number;
  saves: number;
}

/** Fewer appearances than this and the rate is too noisy to quote. */
export const MIN_GAMES = 6;

export const METRIC: Record<NicheCategory, { label: string; get: (p: PlayerSeasonStats) => number }> = {
  fouls: { label: "fouls", get: (p) => p.fouls },
  tackles: { label: "tacklinger", get: (p) => p.tackles },
  shots: { label: "skud", get: (p) => p.shots },
  "shots-on-target": { label: "skud på mål", get: (p) => p.shotsOn },
  saves: { label: "redninger", get: (p) => p.saves },
  cards: { label: "kort", get: (p) => p.cards },
};

/** P(X ≥ k) for X ~ Poisson(λ). */
export function poissonAtLeast(lambda: number, k: number): number {
  if (k <= 0) return 1;
  if (lambda <= 0) return 0;
  let term = Math.exp(-lambda); // P(X = 0)
  let cdf = term;
  for (let i = 1; i < k; i++) {
    term *= lambda / i;
    cdf += term;
  }
  return Math.min(1, Math.max(0, 1 - cdf));
}

/** "2+" → 2, "Yes" → 1; anything else (over/under lines etc.) can't be modelled. */
export function lineFromLabel(label: string): number | null {
  const m = /^(\d+)\+$/.exec(label.trim());
  if (m) return Number(m[1]);
  if (/^(yes|ja)$/i.test(label.trim())) return 1;
  return null;
}

/**
 * Pool two seasons of the same squad: early in a season a player has played
 * 8 games, which is too few to call a rate "normal". Totals simply add up.
 */
export function mergeRosters(current: PlayerSeasonStats[], previous: PlayerSeasonStats[]): PlayerSeasonStats[] {
  const prev = new Map(previous.map((p) => [p.id, p]));
  return current.map((c) => {
    const o = prev.get(c.id);
    if (!o) return c;
    return {
      ...c,
      apps: c.apps + o.apps,
      minutes: c.minutes + o.minutes,
      fouls: c.fouls + o.fouls,
      tackles: c.tackles + o.tackles,
      shots: c.shots + o.shots,
      shotsOn: c.shotsOn + o.shotsOn,
      cards: c.cards + o.cards,
      saves: c.saves + o.saves,
    };
  });
}

export function playerContext(
  category: NicheCategory,
  label: string,
  p: PlayerSeasonStats,
  season: number,
  displayName: string,
  fromSeason?: number,
): PlayerStatContext | null {
  const line = lineFromLabel(label);
  if (line === null || p.apps < MIN_GAMES) return null;
  const { label: metric, get } = METRIC[category];
  const total = get(p);
  const perGame = total / p.apps;
  const modelProbability = poissonAtLeast(perGame, line);
  if (!(modelProbability > 0)) return null;
  return {
    player: displayName,
    season,
    ...(fromSeason && fromSeason < season ? { fromSeason } : {}),
    metric,
    games: p.apps,
    total,
    perGame: Number(perGame.toFixed(2)),
    line,
    modelProbability: Number(modelProbability.toFixed(4)),
    modelFairOdds: Number((1 / modelProbability).toFixed(3)),
  };
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Find "Sven Botman" / "Joelinton" in a roster (names differ by initials and accents). */
export function findPlayer(roster: PlayerSeasonStats[], wanted: string): PlayerSeasonStats | null {
  const w = norm(wanted);
  if (!w) return null;
  const tokens = w.split(" ");
  const last = tokens[tokens.length - 1];

  // 1. full-name match on first + last, or mononym ("Joelinton")
  const exact = roster.find((p) => norm(p.name) === w || norm(`${p.first} ${p.last}`) === w);
  if (exact) return exact;

  // 2. same surname, and first initial agrees (API-Football shows "S. Botman")
  const bySurname = roster.filter((p) => norm(p.last).split(" ").pop() === last || norm(p.name).endsWith(` ${last}`));
  if (bySurname.length === 1) return bySurname[0];
  if (bySurname.length > 1 && tokens.length > 1) {
    const initial = tokens[0][0];
    const hit = bySurname.filter((p) => norm(p.first || p.name)[0] === initial);
    if (hit.length === 1) return hit[0];
  }

  // 3. mononym: a single token that is the player's whole first/last name
  if (tokens.length === 1) {
    const mono = roster.filter((p) => norm(p.name) === w || norm(p.last) === w || norm(p.first) === w);
    if (mono.length === 1) return mono[0];
  }
  return null;
}
