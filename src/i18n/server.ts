import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, enabledLocales, intlLocale, isLocale, LOCALE_COOKIE, localeDir, type Locale } from "./config";
import { loadDictionary } from "./dictionaries";
import { makeTranslator } from "./translate";

function fromAcceptLanguage(header: string | null, allowed: Locale[]): Locale | null {
  if (!header) return null;
  const parts = header
    .split(",")
    .map((p) => {
      const [tag, q] = p.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of parts) {
    const base = tag.split("-")[0];
    if (isLocale(base) && allowed.includes(base)) return base;
  }
  return null;
}

export const getLocale = cache(async (): Promise<Locale> => {
  const allowed = enabledLocales();
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c) && allowed.includes(c)) return c;
  const h = await headers();
  return fromAcceptLanguage(h.get("accept-language"), allowed) ?? DEFAULT_LOCALE;
});

export const getI18n = cache(async () => {
  const locale = await getLocale();
  const dict = await loadDictionary(locale);
  const intl = intlLocale(locale);
  const { t, tp } = makeTranslator(dict, intl);
  return { locale, dir: localeDir(locale), intl, dict, t, tp };
});

export async function getT() {
  return (await getI18n()).t;
}
