/**
 * Languages. English and Hindi launch first; the others have a dictionary
 * file (possibly partial — missing strings fall back to English) and are
 * switched on with ENABLED_LOCALES, e.g. "en,hi,ar".
 */
export const LOCALES = {
  en: { native: "English", english: "English", dir: "ltr", intl: "en-IN" },
  hi: { native: "हिन्दी", english: "Hindi", dir: "ltr", intl: "hi-IN" },
  ar: { native: "العربية", english: "Arabic", dir: "rtl", intl: "ar-AE" },
  bn: { native: "বাংলা", english: "Bengali", dir: "ltr", intl: "bn-IN" },
  fr: { native: "Français", english: "French", dir: "ltr", intl: "fr-FR" },
  ru: { native: "Русский", english: "Russian", dir: "ltr", intl: "ru-RU" },
  sw: { native: "Kiswahili", english: "Swahili", dir: "ltr", intl: "sw-KE" },
} as const;

export type Locale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "lang";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && value in LOCALES;
}

export function enabledLocales(): Locale[] {
  const raw = process.env.ENABLED_LOCALES || process.env.NEXT_PUBLIC_ENABLED_LOCALES || "en,hi";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(isLocale);
  return list.length ? list : ["en", "hi"];
}

export function localeDir(locale: Locale) {
  return LOCALES[locale].dir;
}

export function intlLocale(locale: Locale) {
  return LOCALES[locale].intl;
}
