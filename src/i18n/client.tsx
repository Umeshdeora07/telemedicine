"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import { makeTranslator, type Dict } from "./translate";

type Ctx = { locale: Locale; intl: string; dir: "ltr" | "rtl"; dict: Dict };
const I18nContext = createContext<Ctx>({ locale: "en", intl: "en-IN", dir: "ltr", dict: {} });

export function I18nProvider({ value, children }: { value: Ctx; children: ReactNode }) {
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  const tr = useMemo(() => makeTranslator(ctx.dict, ctx.intl), [ctx.dict, ctx.intl]);
  return { ...ctx, ...tr };
}

export function useT() {
  return useI18n().t;
}
