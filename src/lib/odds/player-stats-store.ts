import "server-only";
import { eq, and } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { feedMeta, teamPlayers } from "@/lib/db/schema";
import { ApiFootballError, apiFootballConfigured, fetchLeagueTeams, fetchTeamPlayers } from "./api-football";
import { LEAGUE_BY_API_ID } from "./config";
import { mergeRosters, type PlayerSeasonStats } from "./player-model";

/**
 * Player season stats for the "why is this value" reasoning. Rosters are cached
 * for days (a season total barely moves in a week) so a refresh costs a handful
 * of API-Football calls per team, once. Everything fails soft: with no key, no
 * access to the season (free plan) or no quota, callers simply get no stats.
 */

const ROSTER_TTL_MS = 3 * 24 * 3_600_000;
const TEAMS_TTL_MS = 30 * 24 * 3_600_000;
/** Don't spend the last calls of the day on stats. */
const MIN_QUOTA = 25;

/** The season whose totals we quote: starts in July (or `API_FOOTBALL_STATS_SEASON`). */
export function statsSeason(now = new Date()): number {
  const forced = Number(process.env.API_FOOTBALL_STATS_SEASON);
  if (forced > 1990) return forced;
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

const APP_LEAGUE_TO_API: Record<string, number> = Object.fromEntries(
  Object.entries(LEAGUE_BY_API_ID).map(([api, app]) => [app, Number(api)]),
);

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(fc|afc|cf|sc|ac|as|sv|fk|bk|if)\b/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** "Newcastle United" ↔ "Newcastle": exact, else one name's words contained in the other's. */
export function matchTeam(
  wanted: string,
  teams: { id: number; name: string }[],
): { id: number; name: string } | null {
  const w = norm(wanted);
  const exact = teams.find((t) => norm(t.name) === w);
  if (exact) return exact;
  const wt = new Set(w.split(" "));
  const hits = teams.filter((t) => {
    const tt = new Set(norm(t.name).split(" "));
    const [small, big] = tt.size <= wt.size ? [tt, wt] : [wt, tt];
    return small.size > 0 && [...small].every((x) => big.has(x));
  });
  return hits.length === 1 ? hits[0] : null;
}

async function meta(key: string): Promise<string | null> {
  const row = await db.select().from(feedMeta).where(eq(feedMeta.key, key)).get();
  return row?.value ?? null;
}
async function setMeta(key: string, value: string) {
  await db
    .insert(feedMeta)
    .values({ key, value })
    .onConflictDoUpdate({ target: feedMeta.key, set: { value } });
}

async function hasQuota(): Promise<boolean> {
  const remaining = Number((await meta("api_remaining")) ?? NaN);
  return !(Number.isFinite(remaining) && remaining < MIN_QUOTA);
}

async function leagueTeams(leagueId: string, season: number) {
  const apiId = APP_LEAGUE_TO_API[leagueId];
  if (!apiId) return null;
  const key = `af_teams_${apiId}_${season}`;
  const cached = await meta(key);
  const at = Number((await meta(`${key}_at`)) ?? 0);
  if (cached && Date.now() - at < TEAMS_TTL_MS) {
    return JSON.parse(cached) as { id: number; name: string }[];
  }
  const teams = await fetchLeagueTeams(apiId, season);
  await setMeta(key, JSON.stringify(teams));
  await setMeta(`${key}_at`, String(Date.now()));
  return teams;
}

async function roster(teamId: number, season: number): Promise<PlayerSeasonStats[]> {
  const row = await db
    .select()
    .from(teamPlayers)
    .where(and(eq(teamPlayers.teamId, teamId), eq(teamPlayers.season, season)))
    .get();
  if (row && Date.now() - new Date(row.fetchedAt).getTime() < ROSTER_TTL_MS) {
    return JSON.parse(row.playersJson) as PlayerSeasonStats[];
  }
  const players = await fetchTeamPlayers(teamId, season);
  const values = { playersJson: JSON.stringify(players), fetchedAt: new Date().toISOString() };
  await db
    .insert(teamPlayers)
    .values({ teamId, season, ...values })
    .onConflictDoUpdate({ target: [teamPlayers.teamId, teamPlayers.season], set: values });
  return players;
}

/**
 * The combined roster of a fixture's two teams, or null when stats aren't
 * available (no key / season not on the plan / out of quota).
 */
export async function fixtureRoster(
  leagueId: string,
  homeTeam: string,
  awayTeam: string,
): Promise<{ players: PlayerSeasonStats[]; season: number; fromSeason: number } | null> {
  if (!apiFootballConfigured()) return null;
  await dbReady;
  if (Date.now() < Number((await meta("stats_blocked_until")) ?? 0)) return null;
  if (!(await hasQuota())) return null;

  const season = statsSeason();
  try {
    const teams = await leagueTeams(leagueId, season);
    if (!teams) return null;
    const players: PlayerSeasonStats[] = [];
    let fromSeason = season;
    for (const name of [homeTeam, awayTeam]) {
      const team = matchTeam(name, teams);
      if (!team) continue;
      const current = await roster(team.id, season);
      // Add last season so a player's "normal" isn't judged on 8 games in October.
      let previous: PlayerSeasonStats[] = [];
      try {
        previous = await roster(team.id, season - 1);
      } catch {
        /* older season not on the plan — current season alone */
      }
      if (previous.length) fromSeason = season - 1;
      players.push(...(previous.length ? mergeRosters(current, previous) : current));
    }
    return players.length ? { players, season, fromSeason } : null;
  } catch (err) {
    // "Free plans do not have access to this season" etc. — don't retry for hours.
    if (err instanceof ApiFootballError) {
      await setMeta("stats_blocked_until", String(Date.now() + 6 * 3_600_000));
    } else {
      console.error("[stats] roster fetch failed:", err);
    }
    return null;
  }
}
