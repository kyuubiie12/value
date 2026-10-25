import "server-only";
import { eq, gt, inArray, lt, sql } from "drizzle-orm";
import type { ValueOpportunity } from "@/types";
import { db, dbReady } from "@/lib/db";
import { feedMeta, nicheFixtures, playerNames } from "@/lib/db/schema";
import { horizonMs, LEAGUE_PRIORITY, MAX_HORIZON_MS } from "./config";
import { loadMarketDicts } from "./market-dicts";
import { findPlayer } from "./player-model";
import { fixtureHistory } from "./player-history";
import { historyContext, isProven, rosterFromHistory } from "./history-model";
import {
  fetchFixtureNicheOdds,
  fetchPlayerNames,
  listTournamentFixtures,
  OddsPapiError,
  TOURNAMENT_LEAGUES,
} from "./oddspapi";
import { displayName, listPropCandidates, proveNiche, type NicheMarkets } from "./niche";

/**
 * Player-prop cache + refresh job (OddsPapi). The plan allowance is small, so
 * the whole thing is sized by three knobs you can raise with the plan:
 *   ODDSPAPI_UNIVERSE      matches tracked at once          (default 8)
 *   ODDSPAPI_STALE_HOURS   re-price a match after this long (default 12)
 *   ODDSPAPI_RESERVE       calls to always keep unspent     (default 15)
 */

const num = (v: string | undefined, d: number) => (v && Number(v) > 0 ? Number(v) : d);
const UNIVERSE = () => num(process.env.ODDSPAPI_UNIVERSE, 8);
const STALE_MS = () => num(process.env.ODDSPAPI_STALE_HOURS, 12) * 3_600_000;
const RESERVE = () => num(process.env.ODDSPAPI_RESERVE, 15);
const LIST_EVERY_MS = 72 * 3_600_000;
const LOCK_MS = 4 * 60_000;
const MAX_PER_RUN = 6;
/** A run stops starting new matches after this long (history for one match takes ~30 s). */
const RUN_BUDGET_MS = 200_000;

async function getAllMeta(): Promise<Record<string, string>> {
  const rows = await db.select().from(feedMeta).all();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

async function setMeta(key: string, value: string) {
  await db
    .insert(feedMeta)
    .values({ key, value })
    .onConflictDoUpdate({ target: feedMeta.key, set: { value } });
}

type Row = typeof nicheFixtures.$inferSelect;

async function pickDue(now: number): Promise<Row[]> {
  const upcoming = (await db
    .select()
    .from(nicheFixtures)
    .where(
      sql`${nicheFixtures.startsAt} > ${new Date(now).toISOString()}
        and ${nicheFixtures.startsAt} < ${new Date(now + MAX_HORIZON_MS).toISOString()}`,
    )
    .all()).filter((f) => new Date(f.startsAt).getTime() <= now + horizonMs(f.leagueId));
  upcoming.sort(
    (a, b) =>
      (LEAGUE_PRIORITY[a.leagueId] ?? 9) - (LEAGUE_PRIORITY[b.leagueId] ?? 9) ||
      a.startsAt.localeCompare(b.startsAt),
  );
  const cutoff = new Date(now - STALE_MS()).toISOString();
  return upcoming
    .slice(0, UNIVERSE())
    .filter((f) => f.fetchedAt === null || f.fetchedAt < cutoff)
    .sort(
      (a, b) =>
        Number(a.fetchedAt !== null) - Number(b.fetchedAt !== null) ||
        a.startsAt.localeCompare(b.startsAt),
    );
}

let needsCache: { at: number; value: boolean } | null = null;

export async function needsNicheRefresh(): Promise<boolean> {
  if (needsCache && Date.now() - needsCache.at < 30_000) return needsCache.value;
  await dbReady;
  const now = Date.now();
  const meta = await getAllMeta();
  let value: boolean;
  if (Number(meta.niche_blocked_until ?? 0) > now || Number(meta.niche_lock ?? 0) > now) value = false;
  else if (now - Number(meta.niche_listed_at ?? 0) > LIST_EVERY_MS || meta.niche_ids_v !== "2" || meta.niche_opps_v !== "2") value = true;
  else value = (await pickDue(now)).length > 0;
  needsCache = { at: now, value };
  return value;
}

async function resolveNames(ids: number[]): Promise<Map<number, string>> {
  const names = new Map<number, string>();
  if (!ids.length) return names;
  const cached = await db.select().from(playerNames).where(inArray(playerNames.id, ids)).all();
  for (const r of cached) names.set(r.id, r.name);
  const missing = ids.filter((id) => !names.has(id));
  if (missing.length) {
    const { names: fetched } = await fetchPlayerNames(missing);
    for (const [id, raw] of Object.entries(fetched)) {
      const name = displayName(raw);
      names.set(Number(id), name);
      await db
        .insert(playerNames)
        .values({ id: Number(id), name })
        .onConflictDoUpdate({ target: playerNames.id, set: { name } });
    }
  }
  return names;
}

function stop(remaining: number | null): boolean {
  return remaining !== null && remaining <= RESERVE();
}

/**
 * Make sure the OddsPapi fixture list (with team ids) is fresh — it is what maps
 * our matches to OddsPapi and SportAPI. Returns false if the quota says stop.
 */
export async function ensureNicheFixtures(): Promise<boolean> {
  await dbReady;
  const now = Date.now();
  const meta = await getAllMeta();
  if (now - Number(meta.niche_listed_at ?? 0) <= LIST_EVERY_MS && meta.niche_ids_v === "2") return true;
  for (const tid of Object.keys(TOURNAMENT_LEAGUES).map(Number)) {
    const { fixtures, remaining } = await listTournamentFixtures(tid);
    for (const f of fixtures) {
      await db
        .insert(nicheFixtures)
        .values({ ...f })
        .onConflictDoUpdate({
          target: nicheFixtures.fixtureId,
          set: { startsAt: f.startsAt, homeTeam: f.homeTeam, awayTeam: f.awayTeam, homeId: f.homeId, awayId: f.awayId },
        });
    }
    if (stop(remaining)) return false;
  }
  await setMeta("niche_listed_at", String(now));
  await setMeta("niche_ids_v", "2");
  return true;
}

/** Re-list fixtures (when due), then price the stalest matches. One run is bounded. */
export async function refreshNiche(): Promise<{ priced: number; skipped?: string }> {
  await dbReady;
  const now = Date.now();
  const meta = await getAllMeta();
  if (Number(meta.niche_blocked_until ?? 0) > now) return { priced: 0, skipped: "quota" };
  if (Number(meta.niche_lock ?? 0) > now) return { priced: 0, skipped: "locked" };
  await setMeta("niche_lock", String(now + LOCK_MS));

  let priced = 0;
  try {
    // One-time: price everything again so props from the old (price-gap) detector are replaced.
    if (meta.niche_opps_v !== "2") {
      await db.update(nicheFixtures).set({ oppsJson: null, fetchedAt: null });
      await setMeta("niche_opps_v", "2");
    }
    await db.delete(nicheFixtures).where(lt(nicheFixtures.startsAt, new Date(now - 3_600_000).toISOString()));

    const markets: NicheMarkets = (await loadMarketDicts()).niche;

    if (!(await ensureNicheFixtures())) return await blocked(priced);

    for (const f of (await pickDue(now)).slice(0, MAX_PER_RUN)) {
      if (Date.now() - now > RUN_BUDGET_MS) break;
      const { odds, remaining } = await fetchFixtureNicheOdds(f.fixtureId);
      const at = new Date().toISOString();
      const candidates = listPropCandidates(f, odds, markets, at);

      // A prop is only shown when the player's own recent matches prove the price too big.
      // No record (no data access, too few matches) → nothing is shown for him.
      const opps: ValueOpportunity[] = [];
      const history = candidates.length ? await fixtureHistory({ homeId: f.homeId, awayId: f.awayId }) : null;
      if (history) {
        const names = await resolveNames([...new Set(candidates.map((c) => c.playerId))]);
        const roster = rosterFromHistory(history.players);
        const byId = new Map(history.players.map((p) => [p.id, p]));
        for (const c of candidates) {
          const name = names.get(c.playerId);
          if (!name) continue;
          const hit = findPlayer(roster, name);
          const player = hit ? byId.get(hit.id) : undefined;
          if (!player) continue;
          const ctx = historyContext(c.category, c.outcomeLabel, player.appearances, name, history.season);
          if (ctx && isProven(ctx, c.bestOdds)) opps.push(proveNiche(c, name, ctx));
        }
        opps.sort((x, y) => y.edgePercent - x.edgePercent);
        opps.splice(15);
      }
      await db
        .update(nicheFixtures)
        .set({ oppsJson: JSON.stringify(opps), fetchedAt: at })
        .where(eq(nicheFixtures.fixtureId, f.fixtureId));
      priced++;
      await setMeta("niche_remaining", String(remaining ?? ""));
      if (stop(remaining)) return await blocked(priced);
    }
    return { priced };
  } catch (err) {
    if (err instanceof OddsPapiError && err.quotaSpent) await blocked(priced);
    else console.error("[niche] refresh failed:", err);
    return { priced };
  } finally {
    needsCache = null;
    await setMeta("niche_lock", "0");
  }
}

async function blocked(priced: number) {
  // Re-check in 12 h: the allowance either reset or we keep waiting.
  await setMeta("niche_blocked_until", String(Date.now() + 12 * 3_600_000));
  return { priced, skipped: "quota" };
}

/** Player-prop opportunities for upcoming matches. */
export async function loadNicheOpportunities(): Promise<ValueOpportunity[]> {
  await dbReady;
  const rows = await db
    .select()
    .from(nicheFixtures)
    .where(gt(nicheFixtures.startsAt, new Date().toISOString()))
    .all();
  const out: ValueOpportunity[] = [];
  for (const r of rows) {
    if (!r.oppsJson) continue;
    try {
      // Only props proven by the player's own matches — older price-gap ones are dropped.
      out.push(...(JSON.parse(r.oppsJson) as ValueOpportunity[]).filter((o) => o.fairBasis === "history"));
    } catch {
      /* skip a corrupt row */
    }
  }
  return out;
}
