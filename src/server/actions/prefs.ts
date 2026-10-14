"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { enabledLocales, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { isCurrency } from "@/config/currencies";
import { canonicalZone, isValidTimeZone } from "@/lib/time";
import { PREF_COOKIES } from "@/lib/prefs";
import { getUser } from "@/server/auth/session";

const YEAR = 60 * 60 * 24 * 365;

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale) || !enabledLocales().includes(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: YEAR, sameSite: "lax" });
  const user = await getUser();
  if (user) await (await getDb()).update(users).set({ language: locale }).where(eq(users.id, user.id));
}

export async function setCurrencyAction(currency: string) {
  if (!isCurrency(currency)) return;
  (await cookies()).set(PREF_COOKIES.currency, currency, { path: "/", maxAge: YEAR, sameSite: "lax" });
  const user = await getUser();
  if (user) await (await getDb()).update(users).set({ currency }).where(eq(users.id, user.id));
}

export async function setTimeZoneAction(rawTz: string, opts: { saveToProfile?: boolean } = {}) {
  const tz = canonicalZone(rawTz);
  if (!isValidTimeZone(tz)) return;
  (await cookies()).set(PREF_COOKIES.tz, tz, { path: "/", maxAge: YEAR, sameSite: "lax" });
  if (opts.saveToProfile) {
    const user = await getUser();
    if (user) await (await getDb()).update(users).set({ timeZone: tz }).where(eq(users.id, user.id));
  }
}

/** Accessibility/display preferences are applied instantly on the client; this saves them to the account. */
export async function savePreferencesAction(prefs: { theme?: string; text?: string; contrast?: string; motion?: string; dataSaver?: boolean }) {
  const user = await getUser();
  if (!user) return;
  const clean = {
    ...user.preferences,
    ...(prefs.theme && ["system", "light", "dark"].includes(prefs.theme) ? { theme: prefs.theme as "system" } : {}),
    ...(prefs.text && ["normal", "large", "xlarge"].includes(prefs.text) ? { text: prefs.text as "normal" } : {}),
    ...(prefs.contrast && ["normal", "high"].includes(prefs.contrast) ? { contrast: prefs.contrast as "normal" } : {}),
    ...(prefs.motion && ["system", "reduce"].includes(prefs.motion) ? { motion: prefs.motion as "system" } : {}),
    ...(typeof prefs.dataSaver === "boolean" ? { dataSaver: prefs.dataSaver } : {}),
  };
  await (await getDb()).update(users).set({ preferences: clean }).where(eq(users.id, user.id));
}

/** "Where are you right now?" — decides which doctors and rules apply. */
export async function setLocationAction(country: string, region?: string | null) {
  if (!/^[A-Z]{2}$/.test(country)) return;
  const value = region && region.startsWith(`${country}-`) ? region : country;
  (await cookies()).set(PREF_COOKIES.location, value, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
}
