import type {
  Confidence,
  MarketStatContext,
  MarketType,
  OddsQuote,
  PriceMovement,
  ValueOpportunity,
} from "@/types";
import { expectedValue, kellyStake, removeVig } from "@/lib/betting-math";
import { getLeague } from "./leagues";

/**
 * Reference "now" — resolved when the server process starts so kick-off times,
 * countdowns and "spottet for X min siden" stay live instead of freezing on a
 * past date. Mock state resets on restart anyway.
 */
const NOW = new Date();

interface OpportunitySeed {
  id: string;
  leagueId: string;
  homeTeam: string;
  awayTeam: string;
  homeForm: string;
  awayForm: string;
  kickoffInHours: number;
  market: MarketType;
  marketLabel: string;
  selection: string;
  /** Full de-vig field at the sharp book, in outcome order. */
  sharpField: number[];
  selectionIndex: number;
  /** Prices seen at soft books for the selection. First entry is used for opening. */
  quotes: { bookmakerId: string; price: number; minutesAgo: number }[];
  openingBest: number;
  movement: PriceMovement;
  booksCount: number;
  signals: string[];
  /** For counting markets (corners, cards): the data behind the line. */
  statContext?: MarketStatContext;
  detectedMinutesAgo: number;
  read?: boolean;
}

const SEEDS: OpportunitySeed[] = [
  {
    id: "vo_ucl_rma_liv_over",
    leagueId: "uefa-ucl",
    homeTeam: "Real Madrid",
    awayTeam: "Liverpool",
    homeForm: "WWDWW",
    awayForm: "WWLWD",
    kickoffInHours: 8,
    market: "over-under",
    marketLabel: "Mål over/under 3.5",
    selection: "Over 3.5 mål",
    sharpField: [2.63, 1.62],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "betano", price: 2.9, minutesAgo: 4 },
      { bookmakerId: "bet365", price: 2.75, minutesAgo: 9 },
      { bookmakerId: "unibet", price: 2.7, minutesAgo: 12 },
      { bookmakerId: "danske-spil", price: 2.5, minutesAgo: 22 },
      { bookmakerId: "leovegas", price: 2.62, minutesAgo: 15 },
      { bookmakerId: "nordicbet", price: 2.68, minutesAgo: 18 },
    ],
    openingBest: 2.7,
    movement: "shortening",
    booksCount: 9,
    signals: [
      "Real Madrid scorer 2,4 mål i snit hjemme, Liverpool 2,1 på udebane",
      "Indbyrdes: de seneste 6 opgør har haft snit 4,3 mål",
      "Begge hold i angrebsform (xG > 2,0)",
    ],
    statContext: {
      metric: "mål",
      homeAvg: 2.4,
      awayAvg: 2.1,
      h2hAvg: 4.3,
      h2hMatches: 6,
      line: 3.5,
    },
    detectedMinutesAgo: 6,
  },
  {
    id: "vo_pl_ars_che_1",
    leagueId: "eng-pl",
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    homeForm: "WWWDW",
    awayForm: "DLWDL",
    kickoffInHours: 26,
    market: "1x2",
    marketLabel: "Kampvinder (1X2)",
    selection: "Arsenal",
    sharpField: [1.96, 3.7, 3.95],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "leovegas", price: 2.15, minutesAgo: 7 },
      { bookmakerId: "nordicbet", price: 2.1, minutesAgo: 15 },
      { bookmakerId: "unibet", price: 2.05, minutesAgo: 18 },
      { bookmakerId: "danske-spil", price: 1.92, minutesAgo: 25 },
      { bookmakerId: "bet365", price: 2.0, minutesAgo: 10 },
    ],
    openingBest: 2.05,
    movement: "shortening",
    booksCount: 8,
    signals: [
      "Arsenal uslået på hjemmebane i 11",
      "Chelsea med 2 midtbanespillere ude i karantæne",
      "Markedet reagerer langsomt på skadesnyt",
    ],
    detectedMinutesAgo: 12,
  },
  {
    id: "vo_sl_fcm_bif_btts",
    leagueId: "den-superliga",
    homeTeam: "FC Midtjylland",
    awayTeam: "Brøndby IF",
    homeForm: "WDWWL",
    awayForm: "WWDLW",
    kickoffInHours: 3,
    market: "btts",
    marketLabel: "Begge hold scorer",
    selection: "Ja",
    sharpField: [1.7, 2.18],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "danske-spil", price: 1.9, minutesAgo: 3 },
      { bookmakerId: "betano", price: 1.83, minutesAgo: 8 },
      { bookmakerId: "bet365", price: 1.8, minutesAgo: 11 },
      { bookmakerId: "nordicbet", price: 1.78, minutesAgo: 14 },
    ],
    openingBest: 1.83,
    movement: "shortening",
    booksCount: 7,
    signals: [
      "BTTS i 7 af 8 seneste for Brøndby",
      "Midtjylland scorer i hver hjemmekamp i sæsonen",
      "Dansk marked prissætter typisk BTTS for højt",
    ],
    detectedMinutesAgo: 4,
  },
  {
    id: "vo_laliga_gir_bet_dc",
    leagueId: "esp-laliga",
    homeTeam: "Girona",
    awayTeam: "Real Betis",
    homeForm: "DWLWD",
    awayForm: "LDLWL",
    kickoffInHours: 49,
    market: "double-chance",
    marketLabel: "Dobbeltchance",
    selection: "Girona eller uafgjort",
    sharpField: [1.42, 2.9],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "leovegas", price: 1.55, minutesAgo: 21 },
      { bookmakerId: "danske-spil", price: 1.5, minutesAgo: 26 },
      { bookmakerId: "betano", price: 1.48, minutesAgo: 20 },
    ],
    openingBest: 1.5,
    movement: "stable",
    booksCount: 6,
    signals: [
      "Betis uden sejr på udebane i 6",
      "Girona taber sjældent to hjemmekampe i træk",
    ],
    detectedMinutesAgo: 24,
    read: true,
  },
  {
    id: "vo_bundesliga_lev_rbl_1x2",
    leagueId: "ger-bundesliga",
    homeTeam: "Bayer Leverkusen",
    awayTeam: "RB Leipzig",
    homeForm: "WDWDW",
    awayForm: "WLWDW",
    kickoffInHours: 27,
    market: "1x2",
    marketLabel: "Kampvinder (1X2)",
    selection: "Uafgjort",
    sharpField: [2.15, 3.5, 3.3],
    selectionIndex: 1,
    quotes: [
      { bookmakerId: "nordicbet", price: 3.9, minutesAgo: 17 },
      { bookmakerId: "betano", price: 3.75, minutesAgo: 20 },
      { bookmakerId: "unibet", price: 3.6, minutesAgo: 24 },
    ],
    openingBest: 3.75,
    movement: "drifting",
    booksCount: 8,
    signals: [
      "4 af 5 seneste indbyrdes endte uafgjort",
      "Begge hold roterer før UCL midtugekamp",
    ],
    detectedMinutesAgo: 18,
  },
  {
    id: "vo_seriea_int_mil_over",
    leagueId: "ita-seriea",
    homeTeam: "Inter",
    awayTeam: "AC Milan",
    homeForm: "WWDWW",
    awayForm: "WDWLW",
    kickoffInHours: 51,
    market: "over-under",
    marketLabel: "Mål over/under 2.5",
    selection: "Over 2.5 mål",
    sharpField: [1.72, 2.16],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "bet365", price: 1.85, minutesAgo: 25 },
      { bookmakerId: "unibet", price: 1.8, minutesAgo: 30 },
      { bookmakerId: "leovegas", price: 1.83, minutesAgo: 28 },
    ],
    openingBest: 1.8,
    movement: "shortening",
    booksCount: 9,
    signals: [
      "Inter scorer 1,8 mål i snit hjemme, Milan 1,5 på udebane",
      "Indbyrdes: Milano-derbyet har haft snit 3,1 mål i de seneste 6 opgør",
      "Begge målmænd i tvivl med mindre skader",
    ],
    statContext: {
      metric: "mål",
      homeAvg: 1.8,
      awayAvg: 1.5,
      h2hAvg: 3.1,
      h2hMatches: 6,
      line: 2.5,
    },
    detectedMinutesAgo: 27,
  },
  {
    id: "vo_ligue1_psg_mrs_ah",
    leagueId: "fra-ligue1",
    homeTeam: "Paris Saint-Germain",
    awayTeam: "Marseille",
    homeForm: "WWWWD",
    awayForm: "WDWLW",
    kickoffInHours: 30,
    market: "asian-handicap",
    marketLabel: "Asiatisk handicap −1.5",
    selection: "PSG −1.5",
    sharpField: [1.98, 1.9],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "betano", price: 2.15, minutesAgo: 14 },
      { bookmakerId: "bet365", price: 2.05, minutesAgo: 19 },
      { bookmakerId: "nordicbet", price: 2.0, minutesAgo: 22 },
    ],
    openingBest: 2.0,
    movement: "shortening",
    booksCount: 7,
    signals: [
      "PSG vinder med 2+ i 6 af 8 hjemmekampe",
      "Marseille uden førstevalgs-forsvar (2 skader)",
      "Marked justerer handicap-linje langsomt",
    ],
    detectedMinutesAgo: 16,
  },
  {
    id: "vo_eredivisie_aja_psv_btts",
    leagueId: "ned-eredivisie",
    homeTeam: "Ajax",
    awayTeam: "PSV",
    homeForm: "WWLWW",
    awayForm: "WWWDW",
    kickoffInHours: 30,
    market: "btts",
    marketLabel: "Begge hold scorer",
    selection: "Ja",
    sharpField: [1.5, 2.65],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "betano", price: 1.62, minutesAgo: 19 },
      { bookmakerId: "bet365", price: 1.57, minutesAgo: 24 },
      { bookmakerId: "unibet", price: 1.55, minutesAgo: 26 },
    ],
    openingBest: 1.57,
    movement: "shortening",
    booksCount: 8,
    signals: [
      "Topopgør: BTTS i 8 af 10 seneste",
      "Begge hold i Eredivisies top-3 for mål scoret",
    ],
    detectedMinutesAgo: 21,
  },
  {
    id: "vo_pl_new_bha_over",
    leagueId: "eng-pl",
    homeTeam: "Newcastle",
    awayTeam: "Brighton",
    homeForm: "WDLWD",
    awayForm: "DWWDL",
    kickoffInHours: 28,
    market: "over-under",
    marketLabel: "Mål over/under 2.5",
    selection: "Over 2.5 mål",
    sharpField: [1.8, 2.05],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "leovegas", price: 2.0, minutesAgo: 11 },
      { bookmakerId: "nordicbet", price: 1.95, minutesAgo: 16 },
      { bookmakerId: "bet365", price: 1.9, minutesAgo: 13 },
    ],
    openingBest: 1.92,
    movement: "stable",
    booksCount: 9,
    signals: [
      "Newcastle scorer 1,7 mål i snit hjemme, Brighton 1,6 på udebane",
      "Indbyrdes: St. James' Park har haft snit 3,2 mål i de seneste 9 opgør",
      "Brighton højt pres → åbne kampe",
    ],
    statContext: {
      metric: "mål",
      homeAvg: 1.7,
      awayAvg: 1.6,
      h2hAvg: 3.2,
      h2hMatches: 9,
      line: 2.5,
    },
    detectedMinutesAgo: 13,
  },
  {
    id: "vo_por_ben_por_1x2",
    leagueId: "por-primeira",
    homeTeam: "Benfica",
    awayTeam: "FC Porto",
    homeForm: "WWDWW",
    awayForm: "WWWDL",
    kickoffInHours: 54,
    market: "draw-no-bet",
    marketLabel: "Draw No Bet",
    selection: "Benfica",
    sharpField: [1.75, 2.05],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "betano", price: 1.95, minutesAgo: 30 },
      { bookmakerId: "danske-spil", price: 1.88, minutesAgo: 34 },
      { bookmakerId: "unibet", price: 1.85, minutesAgo: 33 },
    ],
    openingBest: 1.88,
    movement: "stable",
    booksCount: 7,
    signals: [
      "Benfica uslået hjemme i O Clássico i 5",
      "Porto med tætpakket program (3 kampe på 8 dage)",
    ],
    detectedMinutesAgo: 31,
    read: true,
  },
  {
    id: "vo_championship_lee_sou_tt",
    leagueId: "eng-championship",
    homeTeam: "Leeds United",
    awayTeam: "Southampton",
    homeForm: "WWWDW",
    awayForm: "WDWWL",
    kickoffInHours: 45,
    market: "team-total",
    marketLabel: "Holdmål — Leeds",
    selection: "Leeds over 1.5 mål",
    sharpField: [1.85, 1.95],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "bet365", price: 2.1, minutesAgo: 26 },
      { bookmakerId: "nordicbet", price: 2.0, minutesAgo: 29 },
    ],
    openingBest: 2.0,
    movement: "shortening",
    booksCount: 5,
    signals: [
      "Leeds scorer 2,1 mål i snit hjemme, Southampton lukker 1,8 ind på udebane",
      "Indbyrdes: Leeds har scoret 2,0 mål i snit i de seneste 5 opgør mod Southampton",
      "Southampton lækker chancer på udebane",
    ],
    statContext: {
      metric: "mål",
      homeAvg: 2.1,
      awayAvg: 1.8,
      h2hAvg: 2.0,
      h2hMatches: 5,
      line: 1.5,
    },
    detectedMinutesAgo: 27,
  },
  {
    id: "vo_uel_roma_lev_dc",
    leagueId: "uefa-uel",
    homeTeam: "AS Roma",
    awayTeam: "Bayer Leverkusen",
    homeForm: "WDWWL",
    awayForm: "WWDWD",
    kickoffInHours: 20,
    market: "double-chance",
    marketLabel: "Dobbeltchance",
    selection: "Roma eller uafgjort",
    sharpField: [1.5, 2.7],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "leovegas", price: 1.62, minutesAgo: 9 },
      { bookmakerId: "betano", price: 1.57, minutesAgo: 12 },
      { bookmakerId: "bet365", price: 1.55, minutesAgo: 15 },
    ],
    openingBest: 1.57,
    movement: "shortening",
    booksCount: 8,
    signals: [
      "Roma stærk defensivt hjemme i Europa (1 mål lukket ind i 5)",
      "Leverkusen roterer før Bundesliga-topkamp",
    ],
    detectedMinutesAgo: 11,
  },
  {
    id: "vo_sl_agf_fck_corners",
    leagueId: "den-superliga",
    homeTeam: "AGF",
    awayTeam: "FC København",
    homeForm: "LDWDL",
    awayForm: "WWDWW",
    kickoffInHours: 5,
    market: "corners",
    marketLabel: "Hjørnespark over/under 9.5",
    selection: "Over 9.5 hjørnespark",
    sharpField: [1.9, 1.9],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "danske-spil", price: 2.1, minutesAgo: 6 },
      { bookmakerId: "bet365", price: 2.0, minutesAgo: 10 },
    ],
    openingBest: 2.0,
    movement: "stable",
    booksCount: 4,
    signals: [
      "AGF henter selv 4,6 hjørnespark i snit på hjemmebane, FCK afgiver 6,3 på udebane",
      "Indbyrdes: de seneste 4 opgør mellem AGF og FCK har haft snit 11,2 hjørnespark",
      "AGF forsvarer dybt → mange afslutninger blokeret",
    ],
    statContext: {
      metric: "hjørnespark",
      homeAvg: 4.6,
      awayAvg: 6.3,
      h2hAvg: 11.2,
      h2hMatches: 4,
      line: 9.5,
    },
    detectedMinutesAgo: 8,
  },
  {
    id: "vo_pl_totn_evt_cards",
    leagueId: "eng-pl",
    homeTeam: "Tottenham",
    awayTeam: "Everton",
    homeForm: "WDWLW",
    awayForm: "LWDLW",
    kickoffInHours: 22,
    market: "cards",
    marketLabel: "Kort over/under 4.5",
    selection: "Over 4.5 kort",
    sharpField: [1.95, 1.85],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "betano", price: 2.15, minutesAgo: 5 },
      { bookmakerId: "bet365", price: 2.05, minutesAgo: 9 },
      { bookmakerId: "unibet", price: 2.0, minutesAgo: 12 },
      { bookmakerId: "nordicbet", price: 1.95, minutesAgo: 15 },
    ],
    openingBest: 2.0,
    movement: "shortening",
    booksCount: 6,
    signals: [
      "Tottenham pådrager sig selv 2,3 kort i snit på hjemmebane, Everton får 2,6 på udebane",
      "Indbyrdes: de seneste 3 opgør mellem Tottenham og Everton har haft snit 5,7 kort",
      "Dommeren til kampen uddeler i snit 5,1 kort per kamp i sæsonen",
    ],
    statContext: {
      metric: "kort",
      homeAvg: 2.3,
      awayAvg: 2.6,
      h2hAvg: 5.7,
      h2hMatches: 3,
      line: 4.5,
    },
    detectedMinutesAgo: 14,
  },
  {
    id: "vo_eredivisie_fey_az_htft",
    leagueId: "ned-eredivisie",
    homeTeam: "Feyenoord",
    awayTeam: "AZ Alkmaar",
    homeForm: "WWDWW",
    awayForm: "DWWLD",
    kickoffInHours: 40,
    market: "ht-ft",
    marketLabel: "Halvleg/fuldtid",
    selection: "Feyenoord/Feyenoord",
    sharpField: [3.3, 1.38],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "betano", price: 3.6, minutesAgo: 8 },
      { bookmakerId: "bet365", price: 3.5, minutesAgo: 13 },
      { bookmakerId: "unibet", price: 3.4, minutesAgo: 16 },
    ],
    openingBest: 3.4,
    movement: "shortening",
    booksCount: 6,
    signals: [
      "Feyenoord fører ved pausen i 7 af 10 hjemmekampe, AZ vender sjældent en pausefør (kun 1 af 9)",
      "Indbyrdes: Feyenoord førte til pause og vandt i 3 af de seneste 5 opgør mod AZ",
      "Feyenoord scorer typisk tidligt hjemme",
    ],
    detectedMinutesAgo: 10,
  },
  {
    id: "vo_laliga_atm_ath_1x2",
    leagueId: "esp-laliga",
    homeTeam: "Atlético Madrid",
    awayTeam: "Athletic Bilbao",
    homeForm: "WDWWW",
    awayForm: "DWLDW",
    kickoffInHours: 33,
    market: "1x2",
    marketLabel: "Kampvinder (1X2)",
    selection: "Atlético Madrid",
    sharpField: [1.75, 3.5, 4.8],
    selectionIndex: 0,
    quotes: [
      { bookmakerId: "nordicbet", price: 1.92, minutesAgo: 22 },
      { bookmakerId: "betano", price: 1.88, minutesAgo: 25 },
      { bookmakerId: "unibet", price: 1.85, minutesAgo: 27 },
    ],
    openingBest: 1.85,
    movement: "shortening",
    booksCount: 9,
    signals: [
      "Metropolitano: Atlético uslået i 9",
      "Bilbao rejser efter Europa-kamp torsdag",
    ],
    detectedMinutesAgo: 23,
  },
];

function confidenceFor(edge: number, booksCount: number, movement: PriceMovement): Confidence {
  const sharpBacked = movement === "shortening";
  if (edge >= 0.05 && booksCount >= 8 && sharpBacked) return "high";
  if (edge >= 0.03 && booksCount >= 6) return "medium";
  return "low";
}

function buildOpportunity(seed: OpportunitySeed): ValueOpportunity {
  const fair = removeVig(seed.sharpField.filter((o) => o > 0));
  const fairProbability =
    fair[seed.selectionIndex] ?? removeVig(seed.sharpField)[seed.selectionIndex];
  const fairOdds = fairProbability > 0 ? 1 / fairProbability : 0;

  const quotes: OddsQuote[] = seed.quotes.map((q) => ({
    bookmakerId: q.bookmakerId,
    price: q.price,
    updatedAt: new Date(NOW.getTime() - q.minutesAgo * 60_000).toISOString(),
  }));

  const best = seed.quotes.reduce((a, b) => (b.price > a.price ? b : a));
  const prices = seed.quotes.map((q) => q.price);
  const averageOdds = prices.reduce((a, b) => a + b, 0) / prices.length;

  const ev = expectedValue(best.price, fairProbability);
  const kellyFraction = kellyStake(best.price, fairProbability, 1);

  return {
    id: seed.id,
    leagueId: seed.leagueId,
    league: getLeague(seed.leagueId)?.name ?? seed.leagueId,
    homeTeam: seed.homeTeam,
    awayTeam: seed.awayTeam,
    homeForm: seed.homeForm,
    awayForm: seed.awayForm,
    startsAt: new Date(NOW.getTime() + seed.kickoffInHours * 3_600_000).toISOString(),
    market: seed.market,
    marketLabel: seed.marketLabel,
    selection: seed.selection,
    bestOdds: best.price,
    bestBookmakerId: best.bookmakerId,
    averageOdds: Number(averageOdds.toFixed(3)),
    fairOdds: Number(fairOdds.toFixed(3)),
    fairProbability: Number(fairProbability.toFixed(4)),
    openingOdds: seed.openingBest,
    priceMovement: seed.movement,
    expectedValue: Number(ev.toFixed(4)),
    edgePercent: Number((ev * 100).toFixed(2)),
    kellyFraction: Number(kellyFraction.toFixed(4)),
    confidence: confidenceFor(ev, seed.booksCount, seed.movement),
    signals: seed.signals,
    statContext: seed.statContext,
    quotes,
    booksCount: seed.booksCount,
    detectedAt: new Date(NOW.getTime() - seed.detectedMinutesAgo * 60_000).toISOString(),
    read: seed.read ?? false,
  };
}

export const MOCK_VALUE_OPPORTUNITIES: ValueOpportunity[] = SEEDS.map(buildOpportunity)
  .filter((o) => o.expectedValue > 0)
  .sort((a, b) => b.edgePercent - a.edgePercent);
