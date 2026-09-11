import "server-only";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import { runMigrations } from "./migrate";

/**
 * SQLite via libSQL. Defaults to a local file under `./data/` — override with
 * `DATABASE_URL` (e.g. a hosted libSQL/Turso URL) without touching app code.
 * A Turso `libsql://` URL needs a companion auth token — set `TURSO_AUTH_TOKEN`
 * (or `DATABASE_AUTH_TOKEN`) when using one. Serverless hosts (Vercel etc.) have
 * no writable local disk, so `DATABASE_URL` is required there.
 */
const url = process.env.DATABASE_URL ?? "file:./data/valuebet.db";
const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });

/** Resolves once the tables exist. `await` this before the first query. */
export const dbReady = runMigrations(client);
