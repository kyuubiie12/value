import "server-only";
import { notFound } from "next/navigation";
import { requireUser, type SessionUser } from "./session";

/**
 * Who counts as an administrator: the e-mails listed in `ADMIN_EMAILS`
 * (comma-separated, case-insensitive). Unset or empty means **nobody** is an
 * admin — the secure default, so a fresh deploy never exposes the user list.
 */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && adminEmails().has(email.trim().toLowerCase());
}

/**
 * Gate for every admin page and action. Signed-out users are sent to /login by
 * `requireUser`; signed-in non-admins get a plain 404 so the route's existence
 * isn't revealed.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) notFound();
  return user;
}
