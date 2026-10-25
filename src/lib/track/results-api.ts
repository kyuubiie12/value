import "server-only";
import { apiFootballCall } from "@/lib/odds/api-football";
import { LEAGUE_BY_API_ID } from "@/lib/odds/config";
import type { PlayerMatchStat } from "./grade";

/** Final-result lookups for grading picks (API-Football). One call each. */

export interface FixtureOutcome {
  state: "final" | "void" | "pending";
  home: number;
  away: number;
}

const FINAL = new Set(["FT", "AET", "PEN"]);
const VOID = new Set(["PST", "CANC", "ABD", "AWD", "WO"]);

interface RawFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { id: number };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
  score: { fulltime: { home: number | null; away: number | null } };
}

export async function fetchFixtureOutcome(id: number): Promise<FixtureOutcome> {
  const { rows } = await apiFootballCall<RawFixture>("/fixtures", { id: String(id) });
  const r = rows[0];
  if (!r) return { state: "pending", home: 0, away: 0 };
  const status = r.fixture.status.short;
  if (VOID.has(status)) return { state: "void", home: 0, away: 0 };
  if (!FINAL.has(status)) return { state: "pending", home: 0, away: 0 };
  // Bets settle on the 90 minutes, not extra time.
  const home = r.score.fulltime.home ?? r.goals.home ?? 0;
  const away = r.score.fulltime.away ?? r.goals.away ?? 0;
  return { state: "final", home, away };
}

interface RawStats {
  statistics: { type: string; value: number | string | null }[];
}

/** Total corners in the match, or null when the provider has no statistics. */
export async function fetchCorners(id: number): Promise<number | null> {
  const { rows } = await apiFootballCall<RawStats>("/fixtures/statistics", { fixture: String(id) });
  if (rows.length < 2) return null;
  let total = 0;
  for (const t of rows) {
    const v = t.statistics.find((s) => s.type === "Corner Kicks")?.value;
    total += Number(v ?? 0);
  }
  return total;
}

interface RawPlayers {
  team: { id: number };
  players: {
    player: { id: number; name: string };
    statistics: {
      games: { minutes: number | null };
      shots: { total: number | null; on: number | null };
      goals: { saves: number | null };
      tackles: { total: number | null };
      fouls: { committed: number | null };
      cards: { yellow: number | null; red: number | null };
    }[];
  }[];
}

const n = (v: number | null | undefined) => v ?? 0;

/** Every player's line in a finished match (both teams). */
export async function fetchMatchPlayers(id: number) {
  const { rows } = await apiFootballCall<RawPlayers>("/fixtures/players", { fixture: String(id) });
  const out: { id: number; name: string; teamId: number; stat: PlayerMatchStat }[] = [];
  for (const team of rows) {
    for (const p of team.players) {
      const s = p.statistics[0];
      if (!s) continue;
      out.push({
        id: p.player.id,
        name: p.player.name,
        teamId: team.team.id,
        stat: {
          minutes: s.games.minutes,
          shots: n(s.shots.total),
          shotsOn: n(s.shots.on),
          tackles: n(s.tackles.total),
          fouls: n(s.fouls.committed),
          saves: n(s.goals.saves),
          cards: n(s.cards.yellow) + n(s.cards.red),
        },
      });
    }
  }
  return out;
}

export interface DayFixture {
  id: number;
  leagueId: string;
  startsAt: string;
  homeTeam: string;
  awayTeam: string;
}

/** All fixtures of one day in the leagues we track — used to find a match's API-Football id. */
export async function fetchDayFixtures(date: string): Promise<DayFixture[]> {
  const { rows } = await apiFootballCall<RawFixture>("/fixtures", { date });
  const out: DayFixture[] = [];
  for (const r of rows) {
    const leagueId = LEAGUE_BY_API_ID[r.league.id];
    if (!leagueId) continue;
    out.push({
      id: r.fixture.id,
      leagueId,
      startsAt: new Date(r.fixture.date).toISOString(),
      homeTeam: r.teams.home.name,
      awayTeam: r.teams.away.name,
    });
  }
  return out;
}

export interface FinishedFixture {
  id: number;
  date: string;
}

/** A team's finished matches in one season, newest first. */
export async function fetchTeamFinished(teamId: number, season: number): Promise<FinishedFixture[]> {
  const { rows } = await apiFootballCall<RawFixture>("/fixtures", {
    team: String(teamId),
    season: String(season),
    status: "FT",
  });
  return rows
    .map((r) => ({ id: r.fixture.id, date: new Date(r.fixture.date).toISOString() }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
