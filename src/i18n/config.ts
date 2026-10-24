/**
 * Languages: the site is in English only for now, as the owner asked. The
 * Hindi translation is kept: ENABLED_LOCALES=en,hi brings back the switch.
 */
export const LOCALES = {
  en: { native: "English", english: "English", intl: "en-IN" },
  hi: { native: "हिन्दी", english: "Hindi", intl: "hi-IN" },
} as const;

export type Locale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && Object.hasOwn(LOCALES, value);
}

export function enabledLocales(): Locale[] {
  const raw = process.env.ENABLED_LOCALES || process.env.NEXT_PUBLIC_ENABLED_LOCALES || "en";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(isLocale);
  return list.includes("en") ? list : ["en", ...list];
}

/** A language the site is shown in right now. */
export function isEnabledLocale(value: unknown): value is Locale {
  return isLocale(value) && enabledLocales().includes(value);
}

export function intlLocale(locale: Locale) {
  return LOCALES[locale].intl;
}
