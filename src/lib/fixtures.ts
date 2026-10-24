import type { ValueOpportunity } from "@/types";

/**
 * A fixture is one real-world match. The feed lists *opportunities* (one per
 * market), so several of them can belong to the same match — this groups them
 * and gives each match a stable, URL-safe id for `/matches/[id]`. Pure; no
 * service imports.
 */

export interface Fixture {
  id: string;
  leagueId: string;
  homeTeam: string;
  awayTeam: string;
  homeForm: string;
  awayForm: string;
  startsAt: string;
  opportunities: ValueOpportunity[];
  /** Best edge (%) across the fixture's opportunities. */
  bestEdge: number;
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function fixtureId(o: Pick<ValueOpportunity, "leagueId" | "homeTeam" | "awayTeam">) {
  return `${o.leagueId}--${slug(o.homeTeam)}--${slug(o.awayTeam)}`;
}

export function fixtureHref(o: Pick<ValueOpportunity, "leagueId" | "homeTeam" | "awayTeam">) {
  return `/matches/${fixtureId(o)}`;
}

export function groupFixtures(opportunities: ValueOpportunity[]): Fixture[] {
  const map = new Map<string, Fixture>();
  for (const o of opportunities) {
    const id = fixtureId(o);
    const f = map.get(id);
    if (f) {
      f.opportunities.push(o);
      f.bestEdge = Math.max(f.bestEdge, o.edgePercent);
    } else {
      map.set(id, {
        id,
        leagueId: o.leagueId,
        homeTeam: o.homeTeam,
        awayTeam: o.awayTeam,
        homeForm: o.homeForm,
        awayForm: o.awayForm,
        startsAt: o.startsAt,
        opportunities: [o],
        bestEdge: o.edgePercent,
      });
    }
  }
  return [...map.values()].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}
