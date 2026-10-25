import type { League } from "@/types";

export const MOCK_LEAGUES: League[] = [
  { id: "eng-pl", name: "Premier League", shortName: "PL", country: "England", tier: 1, accent: "#b39ddb" },
  { id: "esp-laliga", name: "LaLiga", shortName: "LAL", country: "Spanien", tier: 1, accent: "#ff8a65" },
  { id: "ita-seriea", name: "Serie A", shortName: "SA", country: "Italien", tier: 1, accent: "#4fc3f7" },
  { id: "ger-bundesliga", name: "Bundesliga", shortName: "BUN", country: "Tyskland", tier: 1, accent: "#ef5350" },
  { id: "fra-ligue1", name: "Ligue 1", shortName: "L1", country: "Frankrig", tier: 1, accent: "#7986cb" },
  { id: "ned-eredivisie", name: "Eredivisie", shortName: "ERE", country: "Holland", tier: 1, accent: "#ffb74d" },
  { id: "por-primeira", name: "Primeira Liga", shortName: "PRI", country: "Portugal", tier: 1, accent: "#66bb6a" },
  { id: "den-superliga", name: "3F Superliga", shortName: "SUP", country: "Danmark", tier: 1, accent: "#e57373" },
  { id: "eng-championship", name: "Championship", shortName: "CHA", country: "England", tier: 2, accent: "#4dd0e1" },
  { id: "uefa-ucl", name: "Champions League", shortName: "UCL", country: "Europa", tier: 0, accent: "#64b5f6" },
  { id: "uefa-uel", name: "Europa League", shortName: "UEL", country: "Europa", tier: 0, accent: "#ffa726" },
  { id: "sau-proleague", name: "Saudi Pro League", shortName: "SPL", country: "Saudi-Arabien", tier: 1, accent: "#81c784" },
  { id: "bel-proleague", name: "Belgian Pro League", shortName: "BEL", country: "Belgien", tier: 1, accent: "#ffd54f" },
  { id: "sco-premiership", name: "Scottish Premiership", shortName: "SCO", country: "Skotland", tier: 1, accent: "#64b5f6" },
  { id: "tur-superlig", name: "Süper Lig", shortName: "TUR", country: "Tyrkiet", tier: 1, accent: "#e57373" },
  { id: "swe-allsvenskan", name: "Allsvenskan", shortName: "ALL", country: "Sverige", tier: 1, accent: "#4dd0e1" },
  { id: "nor-eliteserien", name: "Eliteserien", shortName: "ELI", country: "Norge", tier: 1, accent: "#ef9a9a" },
  { id: "aut-bundesliga", name: "Austrian Bundesliga", shortName: "AUT", country: "Østrig", tier: 1, accent: "#f48fb1" },
  { id: "sui-superleague", name: "Swiss Super League", shortName: "SUI", country: "Schweiz", tier: 1, accent: "#ff8a80" },
  { id: "gre-superleague", name: "Super League Greece", shortName: "GRE", country: "Grækenland", tier: 1, accent: "#80deea" },
  { id: "pol-ekstraklasa", name: "Ekstraklasa", shortName: "POL", country: "Polen", tier: 1, accent: "#ce93d8" },
  { id: "cro-hnl", name: "HNL", shortName: "CRO", country: "Kroatien", tier: 1, accent: "#90caf9" },
  { id: "usa-mls", name: "MLS", shortName: "MLS", country: "USA", tier: 1, accent: "#a5d6a7" },
  { id: "bra-seriea", name: "Brasileirão", shortName: "BRA", country: "Brasilien", tier: 1, accent: "#fff176" },
  { id: "arg-primera", name: "Primera División", shortName: "ARG", country: "Argentina", tier: 1, accent: "#81d4fa" },
  { id: "mex-ligamx", name: "Liga MX", shortName: "MEX", country: "Mexico", tier: 1, accent: "#ffab91" },
  { id: "ger-bundesliga2", name: "2. Bundesliga", shortName: "BU2", country: "Tyskland", tier: 2, accent: "#ef5350" },
  { id: "ita-serieb", name: "Serie B", shortName: "SB", country: "Italien", tier: 2, accent: "#4fc3f7" },
  { id: "fra-ligue2", name: "Ligue 2", shortName: "L2", country: "Frankrig", tier: 2, accent: "#7986cb" },
  { id: "esp-laliga2", name: "LaLiga 2", shortName: "LA2", country: "Spanien", tier: 2, accent: "#ff8a65" },
  { id: "eng-leagueone", name: "League One", shortName: "L1E", country: "England", tier: 3, accent: "#4dd0e1" },
  { id: "den-1division", name: "1. Division", shortName: "1DK", country: "Danmark", tier: 2, accent: "#e57373" },
  { id: "uefa-uecl", name: "Conference League", shortName: "UECL", country: "Europa", tier: 0, accent: "#9ccc65" },
];

export const LEAGUE_MAP: Record<string, League> = Object.fromEntries(
  MOCK_LEAGUES.map((l) => [l.id, l]),
);

export function getLeague(id: string): League | undefined {
  return LEAGUE_MAP[id];
}
