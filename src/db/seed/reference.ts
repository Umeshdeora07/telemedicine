import { eq, sql } from "drizzle-orm";
import type { DB } from "@/db";
import * as s from "@/db/schema";
import { COUNTRIES, DEMO_FX } from "./data/countries";
import { SPECIALTIES } from "./data/specialties";

export const PLATFORM_FEE_INR_MINOR = 2500;

/**
 * Data every site needs, with or without demo data: countries, starting
 * exchange rates, default settings and the four specialties. Safe to run on
 * every start: it only adds what is missing and never changes existing rows.
 */
export async function ensureReferenceData(db: DB, today = new Date().toISOString().slice(0, 10)) {
  await db
    .insert(s.countries)
    .values(COUNTRIES.map((c) => ({ ...c, consentText: null })))
    .onConflictDoNothing();
  const [rates] = await db.select({ n: sql<number>`count(*)::int` }).from(s.exchangeRates);
  if (!Number(rates?.n)) {
    await db.insert(s.exchangeRates).values(
      Object.entries(DEMO_FX)
        .filter(([q]) => q !== "INR")
        .map(([quote, rate]) => ({ base: "INR", quote, rate, asOf: today, source: "default" })),
    );
  }
  await db
    .insert(s.settings)
    .values([
      { key: "refund_policy", value: { doctorNoShowMinutes: 10, patientCancelFullRefundHours: 4, patientCancelPartialRefundPercent: 50, rescheduleFreeHours: 2 } },
      { key: "platform_fee", value: { inrMinor: PLATFORM_FEE_INR_MINOR, gstRate: 0.18 } },
      { key: "consent_versions", value: { terms: "1.0", privacy: "1.0", telemedicine: "1.0" } },
    ])
    .onConflictDoNothing();
  for (const sp of SPECIALTIES) {
    const { reviewer: _r, ...rest } = sp;
    // Prices start at 0 ("From" is hidden) until doctors set their fees.
    await db.insert(s.specialties).values({ ...rest, startingFeeMinor: 0 }).onConflictDoNothing({ target: s.specialties.slug });
  }
}

/** Specialty ids by slug (after ensureReferenceData). */
export async function specialtyIds(db: DB) {
  const rows = await db.select({ id: s.specialties.id, slug: s.specialties.slug }).from(s.specialties);
  return Object.fromEntries(rows.map((r) => [r.slug, r.id])) as Record<string, string>;
}

/** Set a specialty's "From" price (lowest online fee in INR minor units). */
export async function setStartingFee(db: DB, slug: string, startingFeeMinor: number) {
  await db.update(s.specialties).set({ startingFeeMinor }).where(eq(s.specialties.slug, slug));
}
