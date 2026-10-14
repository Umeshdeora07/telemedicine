import { cookies } from "next/headers";
import { isCurrency, currencyForCountry, type Currency } from "@/config/currencies";
import { canonicalZone, isValidTimeZone } from "./time";

export type Prefs = {
  theme: "system" | "light" | "dark";
  text: "normal" | "large" | "xlarge";
  contrast: "normal" | "high";
  motion: "system" | "reduce";
  dataSaver: boolean;
};

export const PREF_COOKIES = {
  theme: "pref_theme",
  text: "pref_text",
  contrast: "pref_contrast",
  motion: "pref_motion",
  dataSaver: "pref_datasaver",
  currency: "currency",
  tz: "tz",
  location: "loc",
} as const;

export async function getPrefs(): Promise<Prefs> {
  const c = await cookies();
  const theme = c.get(PREF_COOKIES.theme)?.value;
  const text = c.get(PREF_COOKIES.text)?.value;
  return {
    theme: theme === "light" || theme === "dark" ? theme : "system",
    text: text === "large" || text === "xlarge" ? text : "normal",
    contrast: c.get(PREF_COOKIES.contrast)?.value === "high" ? "high" : "normal",
    motion: c.get(PREF_COOKIES.motion)?.value === "reduce" ? "reduce" : "system",
    dataSaver: c.get(PREF_COOKIES.dataSaver)?.value === "1",
  };
}

export function htmlClasses(p: Prefs) {
  return [
    p.theme === "dark" ? "dark" : "",
    p.contrast === "high" ? "hc" : "",
    p.text === "large" ? "lt" : p.text === "xlarge" ? "xlt" : "",
    p.motion === "reduce" ? "rm" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Viewer's display currency and time zone (cookie, then account, then a default). */
export async function getViewerRegion(user?: { currency: string; timeZone: string; countryCode: string } | null) {
  const c = await cookies();
  const curCookie = c.get(PREF_COOKIES.currency)?.value;
  const rawTz = c.get(PREF_COOKIES.tz)?.value;
  const tzCookie = rawTz ? canonicalZone(rawTz) : undefined;
  const currency: Currency = isCurrency(curCookie) ? curCookie : user && isCurrency(user.currency) ? user.currency : currencyForCountry(user?.countryCode ?? "IN");
  const tz = tzCookie && isValidTimeZone(tzCookie) ? tzCookie : user?.timeZone && isValidTimeZone(user.timeZone) ? user.timeZone : "Asia/Kolkata";
  return { currency, tz, tzFromCookie: Boolean(tzCookie) };
}

/** "IN", "US-NY": where the viewer says they are right now. */
export async function getDeclaredLocation(): Promise<{ country: string; region: string | null } | null> {
  const raw = (await cookies()).get(PREF_COOKIES.location)?.value;
  if (!raw) return null;
  const [country, ...rest] = raw.split("-");
  if (!country || !/^[A-Z]{2}$/.test(country)) return null;
  return { country, region: rest.length ? `${country}-${rest.join("-")}` : null };
}
