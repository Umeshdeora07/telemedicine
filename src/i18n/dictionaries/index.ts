import type { Locale } from "../config";
import type { Dict } from "../translate";

// Dictionaries load lazily so each request only pulls in one language.
const loaders: Record<Locale, () => Promise<Dict>> = {
  en: async () => ({}),
  hi: () => import("./hi").then((m) => m.default),
};

export async function loadDictionary(locale: Locale): Promise<Dict> {
  return loaders[locale]();
}
