import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["en", "hi", "ar", "bn", "fr", "ru", "sw"];

/** Constant-time string comparison (no Node crypto needed here). */
function sameText(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** HTTP Basic auth password from the request, or null. Any username is accepted. */
function basicPassword(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = atob(header.slice(6));
    return decoded.slice(decoded.indexOf(":") + 1);
  } catch {
    return null;
  }
}

/**
 * Runs before every page request:
 *  - DEMO_ACCESS_PASSWORD, when set, puts a password on the whole site so a
 *    public demo link isn't open to strangers (the browser asks once)
 *  - passes the current path to server components (for "return to" links after login)
 *  - `?lang=hi` switches language (shareable links)
 */
export function proxy(request: NextRequest) {
  const password = process.env.DEMO_ACCESS_PASSWORD;
  if (password) {
    const given = basicPassword(request);
    if (given === null || !sameText(given, password)) {
      return new NextResponse("Enter the demo password to see this site.", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Demo", charset="UTF-8"', "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  const res = NextResponse.next({ request: { headers } });
  const lang = request.nextUrl.searchParams.get("lang");
  if (lang && LOCALES.includes(lang)) {
    res.cookies.set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return res;
}

export const config = {
  // API routes are left out: they check their own sessions or secrets, the host's
  // health check must reach /api/health, and running uploads through the proxy
  // would buffer (and cut off) request bodies over 10 MB.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|icons/|images/|sw.js|manifest.webmanifest|robots.txt|sitemap.xml).*)"],
};
