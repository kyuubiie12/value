import "server-only";
import { BOOKMAKER_BY_API_ID, LEAGUE_BY_API_ID, WANTED_BETS } from "./config";
import type { BookOdds } from "./detect";
import type { PlayerSeasonStats } from "./player-model";

/**
 * Thin API-Football (api-sports.io v3) client. Server only; the key never
 * leaves the process. Every call is counted by the provider, so callers go
 * through `store.ts`, which caches in the database.
 */

const BASE = "https://v3.football.api-sports.io";

export const apiFootballConfigured = () => Boolean(process.env.API_FOOTBALL_KEY);

export class ApiFootballError extends Error {
  constructor(
    message: string,
    /** True when the plan's daily quota is spent — stop calling until tomorrow. */
    readonly quotaSpent = false,
  ) {
    super(message);
  }
}

interface ApiEnvelope<T> {
  errors: unknown;
  response: T[];
}

/** Calls left today as of the latest response in this process (null until one is made). */
let lastRemaining: number | null = null;
export const lastKnownRemaining = () => lastRemaining;

async function call<T>(
  path: string,
  params: Record<string, string>,
): Promise<{ rows: T[]; remaining: number | null }> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new ApiFootballError("API_FOOTBALL_KEY is not set");

  const res = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });
  const remainingHeader = res.headers.get("x-ratelimit-requests-remaining");
  const remaining = remainingHeader === null ? null : Number(remainingHeader);
  if (remaining !== null) lastRemaining = remaining;

  if (!res.ok) throw new ApiFootballError(`API-Football ${res.status}`, res.status === 429);
  const json = (await res.json()) as ApiEnvelope<T>;

  // Errors come back as 200 with an `errors` object (or [] when fine).
  const errors = json.errors && !Array.isArray(json.errors) ? json.errors : null;
  if (errors && Object.keys(errors).length) {
    const text = JSON.stringify(errors);
    throw new ApiFootballError(text, /request|limit|quota/i.test(text));
  }
  return { rows: json.response, remaining };
}

export const apiFootballCall = call;

export interface ListedFixture {
  fixtureId: number;
  leagueId: string;
  startsAt: string;
  homeTeam: string;
  awayTeam: string;
}

interface RawFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { id: number };
  teams: { home: { name: string }; away: { name: string } };
}

/** Not-yet-started fixtures on one day (YYYY-MM-DD, UTC) in the leagues we track. */
export async function listFixtures(date: string) {
  const { rows, remaining } = await call<RawFixture>("/fixtures", { date });
  const fixtures: ListedFixture[] = [];
  for (const r of rows) {
    const leagueId = LEAGUE_BY_API_ID[r.league.id];
    if (!leagueId || r.fixture.status.short !== "NS") continue;
    fixtures.push({
      fixtureId: r.fixture.id,
      leagueId,
      startsAt: new Date(r.fixture.date).toISOString(),
      homeTeam: r.teams.home.name,
      awayTeam: r.teams.away.name,
    });
  }
  return { fixtures, remaining };
}

interface RawOdds {
  update: string;
  bookmakers: {
    id: number;
    bets: { id: number; values: { value: string; odd: string }[] }[];
  }[];
}

/** "Home +0.5" → "Home 0.5" so labels match what the detector builds. */
const cleanValue = (v: string) => v.replace(/\s*\+/g, " ").replace(/\s+/g, " ").trim();

/** Keep only the books and bets we use — a raw response is ~135 KB. */
export async function fetchFixtureOdds(fixtureId: number) {
  const { rows, remaining } = await call<RawOdds>("/odds", { fixture: String(fixtureId) });
  const row = rows[0];
  const odds: BookOdds = {};
  if (row) {
    for (const bm of row.bookmakers) {
      const book = BOOKMAKER_BY_API_ID[bm.id];
      if (!book) continue;
      for (const bet of bm.bets) {
        const betId = String(bet.id);
        if (!WANTED_BETS.has(betId)) continue;
        const target = ((odds[book] ??= {})[betId] ??= {});
        for (const v of bet.values) {
          const odd = Number(v.odd);
          if (odd > 1) target[cleanValue(v.value)] = odd;
        }
      }
    }
  }
  return { odds, updatedAt: row?.update ?? null, remaining };
}

interface RawTeamRow {
  team: { id: number; name: string };
}

/** Teams of one league-season: name → API-Football team id. */
export async function fetchLeagueTeams(leagueApiId: number, season: number) {
  const { rows } = await call<RawTeamRow>("/teams", {
    league: String(leagueApiId),
    season: String(season),
  });
  return rows.map((r) => ({ id: r.team.id, name: r.team.name }));
}

interface RawPlayerRow {
  player: { id: number; name: string; firstname?: string; lastname?: string };
  statistics: {
    team: { id: number };
    games: { appearences: number | null; minutes: number | null; position?: string };
    shots: { total: number | null; on: number | null };
    goals: { saves: number | null };
    tackles: { total: number | null };
    fouls: { committed: number | null };
    cards: { yellow: number | null; yellowred: number | null; red: number | null };
  }[];
}

const n = (v: number | null | undefined) => v ?? 0;

/**
 * Every player of a team with their season totals, summed over all competitions
 * the team played in (league + cups), one API call per page of 20 players.
 */
export async function fetchTeamPlayers(teamId: number, season: number): Promise<PlayerSeasonStats[]> {
  const out: PlayerSeasonStats[] = [];
  for (let page = 1; page <= 4; page++) {
    let rows: RawPlayerRow[];
    try {
      ({ rows } = await call<RawPlayerRow>("/players", {
        team: String(teamId),
        season: String(season),
        page: String(page),
      }));
    } catch (err) {
      // The free plan stops at page 3 — keep what we have rather than lose the squad.
      if (page > 1) break;
      throw err;
    }
    for (const r of rows) {
      const mine = r.statistics.filter((st) => st.team.id === teamId);
      if (!mine.length) continue;
      out.push({
        id: r.player.id,
        first: r.player.firstname ?? "",
        last: r.player.lastname ?? "",
        name: r.player.name,
        position: mine[0].games.position ?? "",
        apps: mine.reduce((a, st) => a + n(st.games.appearences), 0),
        minutes: mine.reduce((a, st) => a + n(st.games.minutes), 0),
        fouls: mine.reduce((a, st) => a + n(st.fouls.committed), 0),
        tackles: mine.reduce((a, st) => a + n(st.tackles.total), 0),
        shots: mine.reduce((a, st) => a + n(st.shots.total), 0),
        shotsOn: mine.reduce((a, st) => a + n(st.shots.on), 0),
        cards: mine.reduce((a, st) => a + n(st.cards.yellow) + n(st.cards.yellowred) + n(st.cards.red), 0),
        saves: mine.reduce((a, st) => a + n(st.goals.saves), 0),
      });
    }
    // A page holds 20 players; fewer means it was the last one.
    if (rows.length < 20) break;
  }
  return out;
}
