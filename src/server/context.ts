import "server-only";
import { cache } from "react";
import { getI18n } from "@/i18n/server";
import { getViewerRegion } from "@/lib/prefs";
import { getSession } from "@/server/auth/session";
import { getRates } from "@/server/queries/reference";
import { formatDate, formatDateTime, formatMoney, formatTime, zoneLabel } from "@/lib/format";
import type { Currency } from "@/config/currencies";
import { feeFor, type FeeTable } from "@/lib/pricing";

/** Everything a page needs to render for this viewer: language, time zone, currency, user. */
export const getViewContext = cache(async () => {
  const i18n = await getI18n();
  const session = await getSession();
  const user = session?.user ?? null;
  const { currency, tz } = await getViewerRegion(user);
  const rates = await getRates();
  const rate = rates[currency]?.rate ?? 1;
  const fmt = {
    money: (minor: number, cur: string = currency) => formatMoney(minor, cur, i18n.intl),
    dateTime: (d: Date | string, zone = tz) => formatDateTime(d, zone, i18n.intl),
    date: (d: Date | string, zone = tz, opts?: Intl.DateTimeFormatOptions) => formatDate(d, zone, i18n.intl, opts),
    time: (d: Date | string, zone = tz) => formatTime(d, zone, i18n.intl),
    zone: (zone = tz, at?: Date) => zoneLabel(zone, at, i18n.intl),
    number: (n: number) => new Intl.NumberFormat(i18n.intl).format(n),
  };
  const priceFor = (fees: FeeTable, mode: string, cur: Currency = currency) => {
    const r = rates[cur]?.rate ?? 1;
    const f = feeFor(fees, mode, cur, r);
    return f ? { ...f, label: formatMoney(f.amountMinor, cur, i18n.intl) } : null;
  };
  return { ...i18n, session, user, currency, tz, rates, rate, ratesAsOf: rates[currency]?.asOf ?? "", fmt, priceFor };
});

export type ViewContext = Awaited<ReturnType<typeof getViewContext>>;
