import "server-only";
import { cache } from "react";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { countries, exchangeRates, specialties } from "@/db/schema";
import { BASE_CURRENCY, type Currency } from "@/config/currencies";

export const getCountries = cache(async () => {
  const db = await getDb();
  return db.select().from(countries).orderBy(asc(countries.name));
});

export const getCountry = cache(async (code: string) => {
  const all = await getCountries();
  return all.find((c) => c.code === code) ?? null;
});

export const getSpecialties = cache(async () => {
  const db = await getDb();
  return db.select().from(specialties).orderBy(asc(specialties.sortOrder));
});

/** Latest exchange rate per currency (1 INR = rate). */
export const getRates = cache(async () => {
  const db = await getDb();
  const rows = await db.select().from(exchangeRates).orderBy(desc(exchangeRates.asOf), desc(exchangeRates.createdAt));
  const map: Partial<Record<Currency, { rate: number; asOf: string }>> = { [BASE_CURRENCY]: { rate: 1, asOf: rows[0]?.asOf ?? new Date().toISOString().slice(0, 10) } };
  for (const r of rows) if (!map[r.quote as Currency]) map[r.quote as Currency] = { rate: r.rate, asOf: r.asOf };
  return map;
});

export async function getRate(currency: Currency) {
  const rates = await getRates();
  return rates[currency] ?? { rate: 1, asOf: "" };
}

export async function getCountryByCode(code: string) {
  const db = await getDb();
  const [c] = await db.select().from(countries).where(eq(countries.code, code));
  return c ?? null;
}
