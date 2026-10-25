/**
 * Settling a pick once the match is over — pure. A pick is either a main-market
 * bet (read off the final score / corner count from the id the odds module
 * minted) or a player prop (stored spec: player, stat, line).
 */

import type { StatSpec } from "@/types";
import type { MatchStats } from "@/lib/odds/sportapi";

export type { StatSpec };
export type PickOutcome = "won" | "lost" | "void";

export type MainSpec =
  | { kind: "1x2" | "dnb" | "dc"; side: "home" | "draw" | "away" | "1x" | "12" | "x2" }
  | { kind: "ah"; line: number; side: "home" | "away" }
  | { kind: "goals" | "home-goals" | "away-goals" | "corners"; line: number; side: "over" | "under" };

export interface PropSpec {
  player: string;
  stat: "shots" | "shots-on-target" | "tackles" | "fouls" | "saves" | "cards";
  line: number;
}

/** `af_{fixtureId}_{marketKey}_{outcomeKey}` → how to grade it, or null if we can't. */
export function parseMainId(id: string): { apiFixtureId: number; spec: MainSpec } | null {
  const m = /^af_(\d+)_(.+)_([a-z0-9]+)$/.exec(id);
  if (!m) return null;
  const apiFixtureId = Number(m[1]);
  const market = m[2];
  const side = m[3];

  if (market === "1x2" && (side === "home" || side === "draw" || side === "away"))
    return { apiFixtureId, spec: { kind: "1x2", side } };
  if (market === "dnb" && (side === "home" || side === "away"))
    return { apiFixtureId, spec: { kind: "dnb", side } };
  if (market === "dc" && (side === "1x" || side === "12" || side === "x2"))
    return { apiFixtureId, spec: { kind: "dc", side } };

  const ah = /^ah(-?\d+(?:\.\d+)?)$/.exec(market);
  if (ah && (side === "home" || side === "away"))
    return { apiFixtureId, spec: { kind: "ah", line: Number(ah[1]), side } };

  const line = /^(ou|tth|tta|cor)(\d+(?:\.\d+)?)$/.exec(market);
  if (line && (side === "over" || side === "under")) {
    const kind = { ou: "goals", tth: "home-goals", tta: "away-goals", cor: "corners" }[line[1] as "ou" | "tth" | "tta" | "cor"] as
      | "goals"
      | "home-goals"
      | "away-goals"
      | "corners";
    return { apiFixtureId, spec: { kind, line: Number(line[2]), side } };
  }
  return null;
}

export interface MatchFacts {
  home: number;
  away: number;
  /** Total corners, when the pick needs it. */
  corners?: number | null;
}

/** Won / lost / void for a main-market pick, or null when a needed number is missing. */
export function gradeMain(spec: MainSpec, f: MatchFacts): PickOutcome | null {
  const { home: h, away: a } = f;
  switch (spec.kind) {
    case "1x2":
      return (spec.side === "home" ? h > a : spec.side === "away" ? a > h : h === a) ? "won" : "lost";
    case "dnb":
      if (h === a) return "void";
      return (spec.side === "home" ? h > a : a > h) ? "won" : "lost";
    case "dc":
      return (spec.side === "1x" ? h >= a : spec.side === "x2" ? a >= h : h !== a) ? "won" : "lost";
    case "ah": {
      // `line` is the home handicap; the away side carries the opposite.
      const diff = spec.side === "home" ? h + spec.line - a : a - spec.line - h;
      return diff > 0 ? "won" : "lost";
    }
    case "goals":
    case "home-goals":
    case "away-goals":
    case "corners": {
      const total =
        spec.kind === "goals" ? h + a : spec.kind === "home-goals" ? h : spec.kind === "away-goals" ? a : f.corners;
      if (total === null || total === undefined) return null;
      return (spec.side === "over" ? total > spec.line : total < spec.line) ? "won" : "lost";
    }
  }
}

/** A player's match record: minutes plus the counting stats we price. */
export interface PlayerMatchStat {
  minutes: number | null;
  shots: number;
  shotsOn: number;
  tackles: number;
  fouls: number;
  saves: number;
  cards: number;
}

const statOf = (s: PlayerMatchStat, stat: PropSpec["stat"]) =>
  ({ shots: s.shots, "shots-on-target": s.shotsOn, tackles: s.tackles, fouls: s.fouls, saves: s.saves, cards: s.cards })[stat];

/** A prop is void when the player never got on the pitch, otherwise count vs. line. */
export function gradeProp(spec: PropSpec, s: PlayerMatchStat): PickOutcome {
  if (!s.minutes) return "void";
  return statOf(s, spec.stat) >= spec.line ? "won" : "lost";
}

/** Profit in units for a flat 1-unit stake. */
export function profitUnits(outcome: PickOutcome, odds: number): number {
  return outcome === "won" ? odds - 1 : outcome === "lost" ? -1 : 0;
}


/** Cards / corners for one line, from the match statistics — null when the numbers aren't there. */
export function gradeStat(spec: StatSpec, stats: MatchStats | null): PickOutcome | null {
  const pair = stats?.[spec.category]?.[spec.period];
  if (!pair) return null;
  const v = spec.scope === "match" ? pair[0] + pair[1] : spec.scope === "home" ? pair[0] : pair[1];
  if (v === spec.line) return "void";
  return (spec.side === "over" ? v > spec.line : v < spec.line) ? "won" : "lost";
}

/** An over line is won the moment it is passed — no need to wait for the whistle. */
export function statWonAlready(spec: StatSpec, stats: MatchStats | null): boolean {
  if (spec.side !== "over") return false;
  const pair = stats?.[spec.category]?.[spec.period];
  if (!pair) return false;
  const v = spec.scope === "match" ? pair[0] + pair[1] : spec.scope === "home" ? pair[0] : pair[1];
  return v > spec.line;
}
