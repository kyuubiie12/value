import "server-only";
import { BOOKMAKER_BY_API_ID, LEAGUE_BY_API_ID, WANTED_BETS } from "./config";
import type { BookOdds } from "./detect";

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
