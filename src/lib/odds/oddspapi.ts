import "server-only";
import { categoryOf, NICHE_BOOKS } from "./niche";
import type { NicheMarkets, RawNicheOdds } from "./niche";
import { isMainMarket, ODDSPAPI_BOOKS, type MainMarkets } from "./oddspapi-main";

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
  7: "uefa-ucl",
  679: "uefa-uel",
  37: "ned-eredivisie",
  18: "eng-championship",
  238: "por-primeira",
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
  participants: {
    participant1Id?: number;
    participant2Id?: number;
    participant1Name: string;
    participant2Name: string;
  };
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
      homeId: f.participants.participant1Id ?? null,
      awayId: f.participants.participant2Id ?? null,
    }));
  return { fixtures, remaining };
}

interface RawMarket {
  marketId: number;
  marketName: string;
  marketType: string;
  period: string;
  handicap: number;
  playerProp: boolean;
  outcomes: { outcomeId: number; outcomeName: string }[];
}

/** One `/markets` call → the player-prop dictionary and the main-market dictionary. */
export async function fetchMarketDictionaries() {
  const { data, remaining } = await call<RawMarket[]>("/markets", { sportId: "10" });
  const niche: NicheMarkets = {};
  const main: MainMarkets = {};
  for (const m of data) {
    const outcomes = Object.fromEntries(m.outcomes.map((o) => [String(o.outcomeId), o.outcomeName]));
    const c = categoryOf(m.marketName, m.playerProp);
    if (c) {
      niche[String(m.marketId)] = { c, n: m.marketName, o: outcomes, ...(m.handicap ? { h: m.handicap } : {}) };
    } else if (isMainMarket(m)) {
      main[String(m.marketId)] = { t: m.marketType, h: m.handicap, o: outcomes };
    }
  }
  return { niche, main, remaining };
}

/** One fixture's prices from every book we compare (props and main markets in one call). */
export async function fetchFixtureNicheOdds(fixtureId: string) {
  const slugs = [...new Set([...Object.keys(NICHE_BOOKS), ...Object.keys(ODDSPAPI_BOOKS)])];
  const { data, remaining } = await call<{ odds?: RawNicheOdds }>("/fixtures/odds", {
    fixtureId,
    bookmakers: slugs.join(","),
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
