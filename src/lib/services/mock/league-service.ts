import { MOCK_LEAGUES } from "@/lib/mock-data";
import { delay } from "@/lib/utils";
import type { LeagueService } from "../types";

export function createMockLeagueService(): LeagueService {
  return {
    async list() {
      return delay(MOCK_LEAGUES, 100);
    },
    async get(id) {
      return delay(MOCK_LEAGUES.find((l) => l.id === id) ?? null, 60);
    },
  };
}
