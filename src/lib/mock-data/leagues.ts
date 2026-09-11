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
];

export const LEAGUE_MAP: Record<string, League> = Object.fromEntries(
  MOCK_LEAGUES.map((l) => [l.id, l]),
);

export function getLeague(id: string): League | undefined {
  return LEAGUE_MAP[id];
}
