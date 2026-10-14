import { CURRENCIES, type Currency } from "@/config/currencies";

/** Amounts are stored as integers in minor units (paise, cents). */
export function formatMoney(minor: number, currency: Currency | string, intl = "en-IN") {
  const cur = (currency in CURRENCIES ? currency : "INR") as Currency;
  const decimals = CURRENCIES[cur].decimals;
  const value = minor / 10 ** decimals;
  const whole = Number.isInteger(value);
  return new Intl.NumberFormat(intl, {
    style: "currency",
    currency: cur,
    minimumFractionDigits: whole ? 0 : decimals,
    maximumFractionDigits: whole ? 0 : decimals,
  }).format(value);
}

export function toMinor(major: number, currency: Currency = "INR") {
  return Math.round(major * 10 ** CURRENCIES[currency].decimals);
}

export function fromMinor(minor: number, currency: Currency = "INR") {
  return minor / 10 ** CURRENCIES[currency].decimals;
}

type DateInput = Date | string | number;
const asDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));

export function formatDate(d: DateInput, tz: string, intl = "en-IN", opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(intl, { timeZone: tz, day: "numeric", month: "short", year: "numeric", ...opts }).format(asDate(d));
}

export function formatTime(d: DateInput, tz: string, intl = "en-IN") {
  return new Intl.DateTimeFormat(intl, { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(asDate(d));
}

export function formatDateTime(d: DateInput, tz: string, intl = "en-IN") {
  return new Intl.DateTimeFormat(intl, {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(asDate(d));
}

export function formatDayLabel(d: DateInput, tz: string, intl = "en-IN") {
  return new Intl.DateTimeFormat(intl, { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(asDate(d));
}

/** Short zone name, e.g. "IST" or "GMT+1". */
export function zoneLabel(tz: string, at: DateInput = new Date(), intl = "en-IN") {
  const parts = new Intl.DateTimeFormat(intl, { timeZone: tz, timeZoneName: "short" }).formatToParts(asDate(at));
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

export function formatRelative(d: DateInput, intl = "en-IN", now = Date.now()) {
  const diff = asDate(d).getTime() - now;
  const rtf = new Intl.RelativeTimeFormat(intl, { numeric: "auto" });
  const abs = Math.abs(diff);
  const min = 60_000;
  if (abs < 60 * min) return rtf.format(Math.round(diff / min), "minute");
  if (abs < 24 * 60 * min) return rtf.format(Math.round(diff / (60 * min)), "hour");
  return rtf.format(Math.round(diff / (24 * 60 * min)), "day");
}

export function formatNumber(n: number, intl = "en-IN", opts?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(intl, opts).format(n);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
