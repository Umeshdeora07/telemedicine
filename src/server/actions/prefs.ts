"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { enabledLocales, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { canonicalZone, isValidTimeZone } from "@/lib/time";
import { isKnownCurrency, isTheme, PREF_COOKIES } from "@/lib/prefs";
import { getUser } from "@/server/auth/session";

const YEAR = 60 * 60 * 24 * 365;

/** Light or dark. Anything else is ignored. Saved to the account when signed in. */
export async function setThemeAction(theme: string) {
  if (!isTheme(theme)) return;
  (await cookies()).set(PREF_COOKIES.theme, theme, { path: "/", maxAge: YEAR, sameSite: "lax" });
  const user = await getUser();
  if (user) await (await getDb()).update(users).set({ preferences: { ...user.preferences, theme } }).where(eq(users.id, user.id));
}

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale) || !enabledLocales().includes(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: YEAR, sameSite: "lax" });
  const user = await getUser();
  if (user) await (await getDb()).update(users).set({ language: locale }).where(eq(users.id, user.id));
}

export async function setCurrencyAction(currency: string) {
  if (!isKnownCurrency(currency)) return;
  (await cookies()).set(PREF_COOKIES.currency, currency, { path: "/", maxAge: YEAR, sameSite: "lax" });
  const user = await getUser();
  if (user) await (await getDb()).update(users).set({ currency }).where(eq(users.id, user.id));
}

/** Remembers the device time zone so times are shown correctly (set automatically on every page). */
export async function setTimeZoneAction(rawTz: string, opts: { saveToProfile?: boolean } = {}) {
  if (typeof rawTz !== "string") return;
  const tz = canonicalZone(rawTz);
  if (!isValidTimeZone(tz)) return;
  (await cookies()).set(PREF_COOKIES.tz, tz, { path: "/", maxAge: YEAR, sameSite: "lax" });
  if (opts?.saveToProfile === true) {
    const user = await getUser();
    if (user) await (await getDb()).update(users).set({ timeZone: tz }).where(eq(users.id, user.id));
  }
}
