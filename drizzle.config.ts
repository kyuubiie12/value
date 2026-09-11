import type { Config } from "drizzle-kit";

/**
 * For `drizzle-kit studio` / `generate` convenience only. The app itself applies
 * schema via `src/lib/db/migrate.ts` at startup (no drizzle-kit at runtime).
 */
export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  // drizzle-kit's sqlite dialect type has no `authToken` field — `studio`/
  // `generate` against a token-protected Turso DB isn't supported here, only
  // plain/local urls. The app itself (src/lib/db/index.ts) does support one.
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/valuebet.db",
  },
} satisfies Config;
