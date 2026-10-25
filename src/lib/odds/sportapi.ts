import "server-only";
import type { PlayerMatchStat } from "@/lib/track/grade";

/**
 * SportAPI (RapidAPI, Sofascore-style data): a team's recent matches and every
 * player's line in them. Team ids are the same ids OddsPapi uses for its
 * participants, so a fixture needs no name matching. Uses the same RapidAPI key
 * as OddsPapi once the account is subscribed to SportAPI.
 */

const HOST = process.env.SPORTAPI_HOST || "sportapi7.p.rapidapi.com";

export const sportApiConfigured = () =>
  Boolean(process.env.RAPIDAPI_ODDSPAPI_KEY) && process.env.SPORTAPI_DISABLED !== "1";

export class SportApiError extends Error {
  constructor(
    message: string,
    /** Not subscribed, or this month's allowance is spent — stop calling for a while. */
    readonly blocked = false,
  ) {
    super(message);
  }
}

let lastRemaining: number | null = null;
export const sportApiRemaining = () => lastRemaining;

async function call<T>(path: string): Promise<T> {
  const key = process.env.RAPIDAPI_ODDSPAPI_KEY;
  if (!key) throw new SportApiError("RAPIDAPI_ODDSPAPI_KEY is not set", true);
  let res!: Response;
  for (let attempt = 0; attempt < 3; attempt++) {
    // Calls are spaced out: the entry plans allow only a call or two per second.
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1300 * attempt));
    res = await fetch(`https://${HOST}${path}`, {
      headers: { "x-rapidapi-key": key, "x-rapidapi-host": HOST },
      cache: "no-store",
    });
    if (res.status !== 429) break; // 429 = too fast (retry) — or the month is spent (give up below)
  }
  const header = res.headers.get("x-ratelimit-requests-remaining");
  if (header !== null) lastRemaining = Number(header);
  if (res.status === 403 || res.status === 429) throw new SportApiError(`SportAPI ${res.status}`, true);
  if (!res.ok) throw new SportApiError(`SportAPI ${res.status}`);
  return (await res.json()) as T;
}

interface RawEvent {
  id: number;
  startTimestamp: number;
  status?: { type?: string };
  tournament?: { name?: string };
  homeTeam: { id: number; name?: string };
  awayTeam: { id: number; name?: string };
  homeScore?: { current?: number };
  awayScore?: { current?: number };
}

export interface RecentMatch {
  id: number;
  date: string;
  /** Goals for / against, from the team's own side. */
  gf: number;
  ga: number;
  home: boolean;
  opponent: string;
}

/** A team's finished competitive matches, newest first (friendlies excluded). */
export async function teamRecentMatches(teamId: number, want: number): Promise<RecentMatch[]> {
  const out: RecentMatch[] = [];
  for (let page = 0; page < 2 && out.length < want; page++) {
    const d = await call<{ events?: RawEvent[]; hasNextPage?: boolean }>(`/api/v1/team/${teamId}/events/last/${page}`);
    const events = (d.events ?? [])
      .filter((e) => e.status?.type === "finished" && !/friendl/i.test(e.tournament?.name ?? ""))
      .sort((a, b) => b.startTimestamp - a.startTimestamp);
    for (const e of events) {
      const home = e.homeTeam.id === teamId;
      const mine = (home ? e.homeScore : e.awayScore)?.current;
      const theirs = (home ? e.awayScore : e.homeScore)?.current;
      if (typeof mine !== "number" || typeof theirs !== "number") continue;
      out.push({
        id: e.id,
        date: new Date(e.startTimestamp * 1000).toISOString(),
        gf: mine,
        ga: theirs,
        home,
        opponent: (home ? e.awayTeam.name : e.homeTeam.name) ?? "",
      });
    }
    if (!d.hasNextPage) break;
  }
  return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, want);
}

interface RawLineups {
  home?: { players?: RawLineupPlayer[] };
  away?: { players?: RawLineupPlayer[] };
}
interface RawLineupPlayer {
  player: { id: number; name: string };
  teamId: number;
  statistics?: Record<string, number | undefined>;
}
interface RawIncidents {
  incidents?: { incidentType?: string; incidentClass?: string; player?: { id: number } }[];
}

export interface MatchPlayer {
  id: number;
  name: string;
  teamId: number;
  stat: PlayerMatchStat;
}

/** Every player's line in one match, with cards counted from the match incidents. */
export async function matchPlayers(eventId: number): Promise<MatchPlayer[]> {
  const lineups = await call<RawLineups>(`/api/v1/event/${eventId}/lineups`);
  const incidents = await call<RawIncidents>(`/api/v1/event/${eventId}/incidents`).catch(
    () => ({ incidents: [] }) as RawIncidents,
  );
  const cards = new Map<number, number>();
  for (const i of incidents.incidents ?? []) {
    if (i.incidentType === "card" && i.player?.id) cards.set(i.player.id, (cards.get(i.player.id) ?? 0) + 1);
  }
  const n = (v: number | undefined) => v ?? 0;
  const out: MatchPlayer[] = [];
  for (const p of [...(lineups.home?.players ?? []), ...(lineups.away?.players ?? [])]) {
    const s = p.statistics;
    if (!s) continue;
    const onTarget = n(s.onTargetScoringAttempt);
    out.push({
      id: p.player.id,
      name: p.player.name,
      teamId: p.teamId,
      stat: {
        // A player who stayed on the bench has no minutes and is skipped downstream.
        minutes: s.minutesPlayed ?? 0,
        shots: s.totalShots ?? onTarget + n(s.shotOffTarget) + n(s.blockedScoringAttempt),
        shotsOn: onTarget,
        tackles: n(s.totalTackle),
        fouls: n(s.fouls),
        saves: n(s.saves),
        cards: cards.get(p.player.id) ?? 0,
      },
    });
  }
  return out;
}

export interface FinishedMatch {
  eventId: number;
  /** Full-time goals, home and away as the fixture lists them. */
  home: number;
  away: number;
}

/**
 * The finished match between two teams around a kick-off time (from the home
 * team's latest results, fresh — not cached), or null while it isn't over.
 */
export async function findFinishedMatch(
  homeId: number,
  awayId: number,
  startsAt: string,
): Promise<FinishedMatch | null> {
  const want = new Date(startsAt).getTime();
  for (let page = 0; page < 2; page++) {
    const d = await call<{ events?: RawEvent[]; hasNextPage?: boolean }>(`/api/v1/team/${homeId}/events/last/${page}`);
    for (const e of d.events ?? []) {
      if (e.status?.type !== "finished" || e.homeTeam.id !== homeId || e.awayTeam.id !== awayId) continue;
      if (Math.abs(e.startTimestamp * 1000 - want) > 6 * 3_600_000) continue;
      const home = e.homeScore?.current;
      const away = e.awayScore?.current;
      if (typeof home !== "number" || typeof away !== "number") continue;
      return { eventId: e.id, home, away };
    }
    if (!d.hasNextPage) break;
  }
  return null;
}

interface RawStatistics {
  statistics?: { period?: string; groups?: { statisticsItems?: { key?: string; homeValue?: number; awayValue?: number }[] }[] }[];
}

/** Total corners in a match (both teams, full time), or null if the provider has none. */
export async function matchCorners(eventId: number): Promise<number | null> {
  const d = await call<RawStatistics>(`/api/v1/event/${eventId}/statistics`);
  const all = d.statistics?.find((p) => p.period === "ALL") ?? d.statistics?.[0];
  for (const g of all?.groups ?? []) {
    const c = g.statisticsItems?.find((i) => i.key === "cornerKicks");
    if (c) return (c.homeValue ?? 0) + (c.awayValue ?? 0);
  }
  return null;
}
