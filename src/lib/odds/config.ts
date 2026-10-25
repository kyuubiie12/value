/**
 * Mapping between API-Football ids and the app's own ids. Pure data — no
 * server-only imports, so the detector can be reused anywhere.
 */

/** API-Football league id → app league id (see `mock-data/leagues.ts`). */
export const LEAGUE_BY_API_ID: Record<number, string> = {
  39: "eng-pl",
  140: "esp-laliga",
  135: "ita-seriea",
  78: "ger-bundesliga",
  61: "fra-ligue1",
  88: "ned-eredivisie",
  94: "por-primeira",
  119: "den-superliga",
  40: "eng-championship",
  2: "uefa-ucl",
  3: "uefa-uel",
};

/** Lower = priced first when the daily call budget is tight. */
export const LEAGUE_PRIORITY: Record<string, number> = {
  "uefa-ucl": 0,
  "eng-pl": 1,
  "den-superliga": 1,
  "esp-laliga": 2,
  "ita-seriea": 2,
  "ger-bundesliga": 2,
  "fra-ligue1": 3,
  "uefa-uel": 3,
  "ned-eredivisie": 4,
  "por-primeira": 4,
  "eng-championship": 5,
  "sau-proleague": 3,
  "bel-proleague": 4,
  "sco-premiership": 4,
  "tur-superlig": 4,
  "swe-allsvenskan": 4,
  "nor-eliteserien": 4,
  "aut-bundesliga": 5,
  "sui-superleague": 5,
  "gre-superleague": 5,
  "pol-ekstraklasa": 5,
  "cro-hnl": 6,
  "usa-mls": 4,
  "bra-seriea": 4,
  "arg-primera": 5,
  "mex-ligamx": 5,
  "ger-bundesliga2": 4,
  "ita-serieb": 5,
  "fra-ligue2": 5,
  "esp-laliga2": 5,
  "eng-leagueone": 6,
  "den-1division": 3,
  "uefa-uecl": 3,
};

/** API-Football bookmaker id → app bookmaker id. Unlisted books are ignored. */
export const BOOKMAKER_BY_API_ID: Record<number, string> = {
  4: "pinnacle",
  3: "betfair",
  8: "bet365",
  16: "unibet",
  27: "nordicbet",
  32: "betano",
  2: "marathonbet",
  7: "williamhill",
  36: "betvictor",
  11: "1xbet",
  6: "bwin",
  26: "betsson",
  21: "888sport",
  24: "betway",
  22: "tipico",
  9: "dafabet",
};

/** Danish-licensed books we compare and offer — everything else is ignored. */
export const PLAYABLE_BOOKS = new Set([
  "bet365",
  "betano",
  "unibet",
  "nordicbet",
  "betsson",
  "bwin",
  "888sport",
  "betway",
  "leovegas",
  "betinia",
]);

/** The sharp reference the fair price is de-vigged from. */
export const SHARP_BOOK = "pinnacle";
/** Books used as a reference only — never offered as a place to bet. */
export const REFERENCE_BOOKS = new Set(["pinnacle", "betfair"]);

/** The bet (market) ids we read, as API-Football numbers them. */
export const BET = {
  matchWinner: "1",
  homeAway: "2",
  asianHandicap: "4",
  goalsOverUnder: "5",
  doubleChance: "12",
  homeTotal: "16",
  awayTotal: "17",
  cornersOverUnder: "45",
} as const;

export const WANTED_BETS = new Set<string>(Object.values(BET));

/**
 * Anything above this EV is far more likely stale or mis-parsed prices than a
 * real edge, so it is dropped rather than shown as a "great" bet.
 */
export const MAX_PLAUSIBLE_EV = 0.25;

/**
 * Long shots are where a proportional de-vig is least reliable (the favourite–
 * longshot bias), so prices above this aren't offered as main-market value.
 */
export const MAX_MAIN_ODDS = 4.5;

/** Below this the "edge" is rounding noise, not something worth a stake. */
export const MIN_EV = 0.005;

/**
 * How far ahead a match is followed. Domestic matches are priced from ~40 h out
 * (that's when lines are settled); the European competitions are followed three
 * days ahead, so a Tuesday/Wednesday night is visible from the weekend.
 */
const CONTINENTAL = new Set(["uefa-ucl", "uefa-uel", "uefa-uecl"]);
export const MAX_HORIZON_MS = 72 * 3_600_000;
export const horizonMs = (leagueId: string) => (CONTINENTAL.has(leagueId) ? 72 : 40) * 3_600_000;
