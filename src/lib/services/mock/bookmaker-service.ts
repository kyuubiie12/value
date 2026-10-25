import { MOCK_BOOKMAKERS } from "@/lib/mock-data";
import { delay } from "@/lib/utils";
import type { BookmakerService } from "../types";

export function createMockBookmakerService(): BookmakerService {
  return {
    async list() {
      // Only Danish-licensed books are offered — the rest stay resolvable by id
      // (logos on older bets) but are never listed or compared.
      return delay(MOCK_BOOKMAKERS.filter((b) => b.denmark), 120);
    },
    async get(id) {
      return delay(MOCK_BOOKMAKERS.find((b) => b.id === id) ?? null, 80);
    },
  };
}
