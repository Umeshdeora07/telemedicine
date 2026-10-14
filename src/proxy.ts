import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["en", "hi", "ar", "bn", "fr", "ru", "sw"];

/**
 * Runs before every page request:
 *  - passes the current path to server components (for "return to" links after login)
 *  - `?lang=hi` switches language (shareable links)
 */
export function proxy(request: NextRequest) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|images/|sw.js|manifest.webmanifest|robots.txt|sitemap.xml).*)"],
};
