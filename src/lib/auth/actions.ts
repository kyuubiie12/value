"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, dbReady } from "@/lib/db";
import { users, userSettings } from "@/lib/db/schema";
import { DEFAULT_SETTINGS } from "@/lib/mock-data";
import { hashPassword, verifyPassword } from "./password";
import {
  createSession,
  destroySession,
  pruneExpiredSessions,
  requireUser,
  revokeOtherSessions,
} from "./session";
import {
  checkLoginThrottle,
  clearLoginThrottle,
  recordLoginFailure,
} from "./rate-limit";

export interface AuthState {
  error?: string;
  fieldErrors?: { name?: string; email?: string; password?: string };
  values?: { name?: string; email?: string };
}

export interface PasswordState {
  ok?: boolean;
  error?: string;
  fieldErrors?: { current?: string; next?: string; confirm?: string };
}

async function clientKey(email: string): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local";
  return `${email}|${ip}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

/** Settings row for a brand-new account — identity fields come from `users`. */
function initialSettings() {
  const data: Partial<typeof DEFAULT_SETTINGS> = { ...DEFAULT_SETTINGS };
  delete data.displayName;
  delete data.email;
  delete data.memberSince;
  data.plan = "free";
  data.onboardingComplete = false;
  return data;
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { name, email, password } = readForm(formData);
  const fieldErrors: AuthState["fieldErrors"] = {};
  if (name.length < 2) fieldErrors.name = "Skriv dit navn (mindst 2 tegn).";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Ugyldig e-mailadresse.";
  if (password.length < 8)
    fieldErrors.password = "Adgangskoden skal være mindst 8 tegn.";
  if (Object.keys(fieldErrors).length)
    return { fieldErrors, values: { name, email } };

  await dbReady;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();
  if (existing) {
    return {
      fieldErrors: { email: "Der findes allerede en konto med den e-mail." },
      values: { name, email },
    };
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  await db.insert(users).values({
    id,
    email,
    passwordHash: await hashPassword(password),
    displayName: name,
    createdAt: now,
  });
  await db
    .insert(userSettings)
    .values({ userId: id, data: initialSettings() });

  await createSession(id);
  redirect("/onboarding");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readForm(formData);
  if (!EMAIL_RE.test(email) || password.length === 0) {
    return {
      error: "Udfyld e-mail og adgangskode.",
      values: { email },
    };
  }

  const key = await clientKey(email);
  const throttle = await checkLoginThrottle(key);
  if (throttle.blocked) {
    return {
      error: `For mange forsøg. Prøv igen om ${throttle.retryInMinutes} min.`,
      values: { email },
    };
  }

  await dbReady;
  const user = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .get();

  const ok = user && (await verifyPassword(password, user.passwordHash));
  if (!ok) {
    await recordLoginFailure(key);
    return { error: "Forkert e-mail eller adgangskode.", values: { email } };
  }

  await clearLoginThrottle(key);
  await pruneExpiredSessions();
  await createSession(user.id);
  redirect("/value-bets");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/** Change the signed-in user's password; logs every other device out. */
export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const fieldErrors: NonNullable<PasswordState["fieldErrors"]> = {};
  if (!current) fieldErrors.current = "Indtast din nuværende adgangskode.";
  if (next.length < 8) fieldErrors.next = "Mindst 8 tegn.";
  if (confirm !== next) fieldErrors.confirm = "De to felter er ikke ens.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const user = await requireUser();
  await dbReady;
  const row = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .get();

  if (!row || !(await verifyPassword(current, row.passwordHash))) {
    return { fieldErrors: { current: "Forkert adgangskode." } };
  }
  if (await verifyPassword(next, row.passwordHash)) {
    return { fieldErrors: { next: "Vælg en ny adgangskode." } };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next) })
    .where(eq(users.id, user.id));
  await revokeOtherSessions(user.id);

  return { ok: true };
}

/** Permanently delete the account and everything attached to it. */
export async function deleteAccountAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const confirm = String(formData.get("confirm") ?? "")
    .trim()
    .toLowerCase();
  if (confirm !== user.email.toLowerCase()) {
    // The UI gates this, so a mismatch here means a tampered request — bail.
    redirect("/profile?s=data");
  }

  await dbReady;
  await db.delete(users).where(eq(users.id, user.id)); // cascades to all tables
  await destroySession();
  redirect("/signup");
}
