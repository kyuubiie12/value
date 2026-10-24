import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, lt, ne } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { SESSION_COOKIE as COOKIE, SESSION_DURATION_MS as DURATION_MS } from "./constants";

const tokenId = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

/** Issue a fresh session and set the cookie. Call only from a Server Action. */
export async function createSession(userId: string): Promise<void> {
  await dbReady;
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + DURATION_MS;

  await db
    .insert(sessions)
    .values({ id: tokenId(token), userId, expiresAt, createdAt: now });
  await db
    .update(users)
    .set({ lastLoginAt: new Date(now).toISOString() })
    .where(eq(users.id, userId));

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

/** Drop the current session row and clear the cookie. Server Action only. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await dbReady;
    await db.delete(sessions).where(eq(sessions.id, tokenId(token)));
  }
  jar.delete(COOKIE);
}

/**
 * The current user, or null. Memoised per request (React `cache`) so pages,
 * layouts and the data layer can all call it without extra queries.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  await dbReady;
  const row = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      createdAt: users.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, tokenId(token)))
    .get();

  if (!row || row.expiresAt < Date.now()) return null;

  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    createdAt: row.createdAt,
  };
});

/** Redirects to /login when signed out. Use in every gated page and action. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireUserId(): Promise<string> {
  return (await requireUser()).id;
}

/** Best-effort cleanup of expired rows — cheap, called after login. */
export async function pruneExpiredSessions(): Promise<void> {
  await dbReady;
  await db.delete(sessions).where(lt(sessions.expiresAt, Date.now()));
}

/** Log every OTHER device out (keeps the current session). After a password change. */
export async function revokeOtherSessions(userId: string): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  await dbReady;
  const keep = token ? tokenId(token) : "";
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, keep)));
}

