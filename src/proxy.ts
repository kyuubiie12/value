import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Optimistic auth gate. Only checks whether a session cookie is *present* — the
 * real check (valid + not expired) happens in `requireUser()` in the data layer
 * and every gated Server Action. A stale cookie slips past here and is caught
 * there, which redirects to /login; the login page renders normally because it
 * does its own `getCurrentUser()` check rather than trusting the cookie.
 */
const PUBLIC_PATHS = ["/login", "/signup"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const hasSession = req.cookies.has(SESSION_COOKIE);

  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
