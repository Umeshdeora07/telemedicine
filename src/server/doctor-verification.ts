import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import type { DB } from "@/db";
import { availabilityRules, documents, doctorFees, doctorLicences, doctorQualifications, type doctors } from "@/db/schema";
import type { getT } from "@/i18n/server";
import { acceptsDirectPayment } from "@/lib/direct-payment";

/** What a doctor must still provide before asking to be verified (empty when ready). */
export async function missingForVerification(db: DB, d: typeof doctors.$inferSelect, t: Awaited<ReturnType<typeof getT>>) {
  const [lic, quals, docs, fees, rules] = await Promise.all([
    db.select().from(doctorLicences).where(and(eq(doctorLicences.doctorId, d.id), eq(doctorLicences.country, "IN"))),
    db.select().from(doctorQualifications).where(eq(doctorQualifications.doctorId, d.id)),
    db.select().from(documents).where(and(eq(documents.doctorId, d.id), isNull(documents.deletedAt))),
    db.select().from(doctorFees).where(eq(doctorFees.doctorId, d.id)),
    db.select().from(availabilityRules).where(eq(availabilityRules.doctorId, d.id)),
  ]);
  const has = (c: string) => docs.some((x) => x.category === c);
  return [
    !lic.length && t("your Indian registration"),
    !has("registration_certificate") && t("registration certificate"),
    !quals.length && t("a qualification"),
    !has("degree_certificate") && t("degree certificate"),
    !has("government_id") && t("government ID"),
    !has("selfie") && t("selfie"),
    !d.photoUrl && t("profile photo"),
    d.about.trim().length < 80 && t("a few lines about you (at least 80 characters)"),
    !d.languages.length && t("languages you speak"),
    !fees.some((f) => f.mode === "video" && f.amountMinor > 0) && t("your video consultation fee"),
    !rules.length && t("your available times"),
    !d.signatureDocumentId && t("your signature"),
    !acceptsDirectPayment(d.paymentDetails) && t("your payment details (UPI or bank account)"),
  ].filter((x): x is string => Boolean(x));
}

