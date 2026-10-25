import "server-only";
import { categoryOf, NICHE_BOOKS } from "./niche";
import type { NicheMarkets, RawNicheOdds } from "./niche";

/**
 * Thin OddsPapi client (via RapidAPI). Server only. Every call counts against
 * the plan's monthly quota (Basic = 250), so callers go through `niche-store.ts`.
 */

const HOST = "odds-api1.p.rapidapi.com";

export const oddsPapiConfigured = () => Boolean(process.env.RAPIDAPI_ODDSPAPI_KEY);

/** OddsPapi tournament id → app league id. */
export const TOURNAMENT_LEAGUES: Record<number, string> = {
  17: "eng-pl",
  8: "esp-laliga",
  23: "ita-seriea",
  35: "ger-bundesliga",
  34: "fra-ligue1",
  39: "den-superliga",
};

export class OddsPapiError extends Error {
  constructor(
    message: string,
    /** The plan's monthly allowance is gone. */
    readonly quotaSpent = false,
  ) {
    super(message);
  }
}

async function call<T>(
  path: string,
  params: Record<string, string>,
): Promise<{ data: T; remaining: number | null }> {
  const key = process.env.RAPIDAPI_ODDSPAPI_KEY;
  if (!key) throw new OddsPapiError("RAPIDAPI_ODDSPAPI_KEY is not set");
  const res = await fetch(`https://${HOST}${path}?${new URLSearchParams(params)}`, {
    headers: { "x-rapidapi-key": key, "x-rapidapi-host": HOST },
    cache: "no-store",
  });
  const header = res.headers.get("x-ratelimit-requests-remaining");
  const remaining = header === null ? null : Number(header);
  if (res.status === 429) throw new OddsPapiError("OddsPapi 429", true);
  if (!res.ok) throw new OddsPapiError(`OddsPapi ${res.status}`);
  return { data: (await res.json()) as T, remaining };
}

interface RawFixture {
  fixtureId: string;
  startTime: number;
  status?: { live?: boolean; statusId?: number };
  participants: { participant1Name: string; participant2Name: string };
}

/** Upcoming, not-yet-started fixtures of one tournament. */
export async function listTournamentFixtures(tournamentId: number) {
  const { data, remaining } = await call<RawFixture[]>("/fixtures", {
    tournamentId: String(tournamentId),
  });
  const now = Date.now();
  const leagueId = TOURNAMENT_LEAGUES[tournamentId];
  const fixtures = data
    .filter((f) => !f.status?.live && f.startTime * 1000 > now)
    .map((f) => ({
      fixtureId: f.fixtureId,
      leagueId,
      startsAt: new Date(f.startTime * 1000).toISOString(),
      homeTeam: f.participants.participant1Name,
      awayTeam: f.participants.participant2Name,
    }));
  return { fixtures, remaining };
}

interface RawMarket {
  marketId: number;
  marketName: string;
  playerProp: boolean;
  outcomes: { outcomeId: number; outcomeName: string }[];
}

/** The player-prop markets we care about, with their outcome labels. */
export async function fetchNicheMarkets() {
  const { data, remaining } = await call<RawMarket[]>("/markets", { sportId: "10" });
  const markets: NicheMarkets = {};
  for (const m of data) {
    const c = categoryOf(m.marketName, m.playerProp);
    if (!c) continue;
    markets[String(m.marketId)] = {
      c,
      n: m.marketName,
      o: Object.fromEntries(m.outcomes.map((o) => [String(o.outcomeId), o.outcomeName])),
    };
  }
  return { markets, remaining };
}

/** One fixture's prices from our comparison books. */
export async function fetchFixtureNicheOdds(fixtureId: string) {
  const { data, remaining } = await call<{ odds?: RawNicheOdds }>("/fixtures/odds", {
    fixtureId,
    bookmakers: Object.keys(NICHE_BOOKS).join(","),
  });
  return { odds: data.odds ?? {}, remaining };
}

/** Player id → "Last, First" for the ids we couldn't resolve from cache. */
export async function fetchPlayerNames(ids: number[]) {
  if (!ids.length) return { names: {} as Record<number, string>, remaining: null };
  const { data, remaining } = await call<{ playerId: number; playerName: string }[]>("/players", {
    playerIds: ids.join(","),
  });
  return {
    names: Object.fromEntries(data.map((p) => [p.playerId, p.playerName])) as Record<number, string>,
    remaining,
  };
}
