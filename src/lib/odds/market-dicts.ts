import "server-only";
import { eq } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { feedMeta } from "@/lib/db/schema";
import { fetchMarketDictionaries } from "./oddspapi";
import type { NicheMarkets } from "./niche";
import type { MainMarkets } from "./oddspapi-main";
import type { StatMarkets } from "./stat-markets";

/**
 * OddsPapi's market catalogue (ids → what a market is), kept in the database
 * for a month: it's a 360 KB response that practically never changes, and both
 * the player-prop and the main-market feeds need it.
 */

const TTL_MS = 30 * 24 * 3_600_000;
const DICT_VERSION = "3"; // 3: goals + assists

export interface MarketDicts {
  niche: NicheMarkets;
  main: MainMarkets;
  stat: StatMarkets;
}

let memo: { at: number; dicts: MarketDicts } | null = null;

async function getMeta(key: string): Promise<string | null> {
  const row = await db.select().from(feedMeta).where(eq(feedMeta.key, key)).get();
  return row?.value ?? null;
}
async function setMeta(key: string, value: string) {
  await db
    .insert(feedMeta)
    .values({ key, value })
    .onConflictDoUpdate({ target: feedMeta.key, set: { value } });
}

export async function loadMarketDicts(): Promise<MarketDicts> {
  if (memo && Date.now() - memo.at < 3_600_000) return memo.dicts;
  await dbReady;
  const at = Number((await getMeta("op_dicts_at")) ?? 0);
  const niche = await getMeta("op_dict_niche");
  const main = await getMeta("op_dict_main");
  const stat = await getMeta("op_dict_stat");
  // Bump when the way markets are classified changes (the catalogue itself is cached for a month).
  const version = await getMeta("op_dict_v");
  if (niche && main && stat && version === DICT_VERSION && Date.now() - at < TTL_MS) {
    const dicts = {
      niche: JSON.parse(niche) as NicheMarkets,
      main: JSON.parse(main) as MainMarkets,
      stat: JSON.parse(stat) as StatMarkets,
    };
    memo = { at: Date.now(), dicts };
    return dicts;
  }
  const fresh = await fetchMarketDictionaries();
  await setMeta("op_dict_niche", JSON.stringify(fresh.niche));
  await setMeta("op_dict_main", JSON.stringify(fresh.main));
  await setMeta("op_dict_stat", JSON.stringify(fresh.stat));
  await setMeta("op_dict_v", DICT_VERSION);
  await setMeta("op_dicts_at", String(Date.now()));
  memo = { at: Date.now(), dicts: { niche: fresh.niche, main: fresh.main, stat: fresh.stat } };
  return memo.dicts;
}
