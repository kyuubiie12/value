import "server-only";
import { categoryOf, NICHE_BOOKS } from "./niche";
import type { NicheMarkets, RawNicheOdds, RawNicheOutcome } from "./niche";
import { isMainMarket, ODDSPAPI_BOOKS, type MainMarkets } from "./oddspapi-main";
import { statMarketOf, type StatMarkets } from "./stat-markets";

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
  955: "sau-proleague",
  38: "bel-proleague",
  36: "sco-premiership",
  52: "tur-superlig",
  40: "swe-allsvenskan",
  20: "nor-eliteserien",
  45: "aut-bundesliga",
  215: "sui-superleague",
  185: "gre-superleague",
  202: "pol-ekstraklasa",
  170: "cro-hnl",
  242: "usa-mls",
  325: "bra-seriea",
  155: "arg-primera",
  27464: "mex-ligamx",
  44: "ger-bundesliga2",
  53: "ita-serieb",
  182: "fra-ligue2",
  54: "esp-laliga2",
  24: "eng-leagueone",
  47: "den-1division",
  34480: "uefa-uecl",
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
  const stat: StatMarkets = {};
  for (const m of data) {
    const outcomes = Object.fromEntries(m.outcomes.map((o) => [String(o.outcomeId), o.outcomeName]));
    const c = categoryOf(m.marketName, m.playerProp);
    if (c) {
      niche[String(m.marketId)] = { c, n: m.marketName, o: outcomes, ...(m.handicap ? { h: m.handicap } : {}) };
    } else if (isMainMarket(m)) {
      main[String(m.marketId)] = { t: m.marketType, h: m.handicap, o: outcomes };
    } else {
      const sm = statMarketOf(m);
      if (sm) stat[String(m.marketId)] = sm;
    }
  }
  return { niche, main, stat, remaining };
}

/**
 * A price is only shown when it can still be played: the book hasn't pulled it, and it has
 * been confirmed recently. A price that hasn't changed for days may be a line the bookmaker
 * removed long ago, and showing it would be false information.
 */
const MAX_PRICE_AGE_MS = (Number(process.env.ODDS_MAX_AGE_HOURS) || 24) * 3_600_000;

type BookStatus = { hasOdds?: boolean; staleOdds?: boolean; suspended?: boolean };

export function playablePrices(
  odds: RawNicheOdds,
  books: Record<string, BookStatus> = {},
  now = Date.now(),
): { fresh: RawNicheOdds; aged: RawNicheOdds } {
  const fresh: RawNicheOdds = {};
  const aged: RawNicheOdds = {};
  for (const [slug, outcomes] of Object.entries(odds)) {
    const b = books[slug];
    if (b && (b.hasOdds === false || b.staleOdds || b.suspended)) continue;
    const keptFresh: Record<string, RawNicheOutcome> = {};
    const keptAged: Record<string, RawNicheOutcome> = {};
    for (const [key, o] of Object.entries(outcomes)) {
      if (o.active === false || o.marketActive === false) continue;
      if (typeof o.changedAt === "number" && now - o.changedAt > MAX_PRICE_AGE_MS) keptAged[key] = o;
      else keptFresh[key] = o;
    }
    if (Object.keys(keptFresh).length) fresh[slug] = keptFresh;
    if (Object.keys(keptAged).length) aged[slug] = keptAged;
  }
  return { fresh, aged };
}

/** One fixture's prices from every book we compare (props and main markets in one call). */
export async function fetchFixtureNicheOdds(fixtureId: string) {
  const slugs = [...new Set([...Object.keys(NICHE_BOOKS), ...Object.keys(ODDSPAPI_BOOKS)])];
  const { data, remaining } = await call<{
    odds?: RawNicheOdds;
    bookmakers?: Record<string, BookStatus>;
    externalProviders?: { sofascoreId?: number | null };
  }>("/fixtures/odds", {
    fixtureId,
    bookmakers: slugs.join(","),
  });
  const { fresh, aged } = playablePrices(data.odds ?? {}, data.bookmakers);
  return {
    odds: fresh,
    /** Older than a day: may no longer be on offer, so only ever shown with a warning. */
    aged,
    eventId: data.externalProviders?.sofascoreId ?? null,
    remaining,
  };
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
