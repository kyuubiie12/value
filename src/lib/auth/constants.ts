/** Dependency-free so `proxy.ts` can import it without pulling in the DB layer. */
export const SESSION_COOKIE = "vb_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
