/**
 * Languages: English and Hindi. ENABLED_LOCALES (for example "en,hi") can
 * switch Hindi off; English is always available as the fallback.
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
  const raw = process.env.ENABLED_LOCALES || process.env.NEXT_PUBLIC_ENABLED_LOCALES || "en,hi";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(isLocale);
  return list.length ? list : ["en", "hi"];
}

export function intlLocale(locale: Locale) {
  return LOCALES[locale].intl;
}
