import { cookies, headers } from "next/headers";
import { CURRENCY_CODES, currencyForCountry, type Currency } from "@/config/currencies";
import { canonicalZone, isValidTimeZone } from "./time";

/** Display preferences. Light is the default; dark only when the visitor turns it on. */
export type Theme = "light" | "dark";
export type Prefs = { theme: Theme };

export const PREF_COOKIES = {
  theme: "pref_theme",
  currency: "currency",
  tz: "tz",
} as const;

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** Strict check (own keys only, so "toString" and friends are rejected). */
export function isKnownCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCY_CODES as readonly string[]).includes(value);
}

export async function getPrefs(): Promise<Prefs> {
  const theme = (await cookies()).get(PREF_COOKIES.theme)?.value;
  return { theme: theme === "dark" ? "dark" : "light" };
}

export function htmlClasses(p: Prefs) {
  return p.theme === "dark" ? "dark" : "";
}

/** Country of the visitor from the host's geo header (Vercel or Cloudflare), if any. */
async function requestCountry(): Promise<string | null> {
  const h = await headers();
  const raw = (h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "").trim().toUpperCase();
  // Cloudflare uses XX for unknown and T1 for Tor.
  return /^[A-Z]{2}$/.test(raw) && raw !== "XX" ? raw : null;
}

/**
 * Viewer's display currency and time zone.
 * Currency: cookie, then the signed in user's currency, then the visitor's
 * country from the request, then INR. Time zone: cookie, then account, then IST.
 */
export async function getViewerRegion(user?: { currency: string; timeZone: string } | null) {
  const c = await cookies();
  const curCookie = c.get(PREF_COOKIES.currency)?.value;
  const rawTz = c.get(PREF_COOKIES.tz)?.value;
  const tzCookie = rawTz ? canonicalZone(rawTz) : undefined;
  let currency: Currency;
  if (isKnownCurrency(curCookie)) currency = curCookie;
  else if (user && isKnownCurrency(user.currency)) currency = user.currency;
  else {
    const country = await requestCountry();
    currency = country ? currencyForCountry(country) : "INR";
  }
  const tz = tzCookie && isValidTimeZone(tzCookie) ? tzCookie : user?.timeZone && isValidTimeZone(user.timeZone) ? user.timeZone : "Asia/Kolkata";
  return { currency, tz, tzFromCookie: Boolean(tzCookie) };
}
