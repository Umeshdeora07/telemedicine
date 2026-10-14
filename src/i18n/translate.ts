export type Dict = Record<string, string>;
export type Vars = Record<string, string | number | undefined | null>;

function interpolate(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (match, k: string) => {
    const v = vars[k];
    return v === undefined || v === null ? match : String(v);
  });
}

/**
 * Strings are keyed by their English text (gettext style), so screens stay
 * readable and any missing translation falls back to English.
 */
export function makeTranslator(dict: Dict | undefined, intl: string) {
  const plural = new Intl.PluralRules(intl);
  const t = (key: string, vars?: Vars) => interpolate(dict?.[key] ?? key, vars);
  /** Plural: tp("{count} doctor", "{count} doctors", n) */
  const tp = (one: string, other: string, count: number, vars?: Vars) => {
    const form = plural.select(count);
    const key = form === "one" ? one : other;
    return interpolate(dict?.[key] ?? key, { count, ...vars });
  };
  return { t, tp };
}

export type T = ReturnType<typeof makeTranslator>["t"];
export type TP = ReturnType<typeof makeTranslator>["tp"];
