import { MOCK_BOOKMAKERS } from "@/lib/mock-data";
import { delay } from "@/lib/utils";
import type { BookmakerService } from "../types";

export function createMockBookmakerService(): BookmakerService {
  return {
    async list() {
      return delay(MOCK_BOOKMAKERS, 120);
    },
    async get(id) {
      return delay(MOCK_BOOKMAKERS.find((b) => b.id === id) ?? null, 80);
    },
  };
}
