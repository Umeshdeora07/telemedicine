import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { doctors, payments, secondOpinions, specialties, users } from "@/db/schema";
import { env } from "@/config/env";
import { brand } from "@/config/brand";
import { refs } from "@/lib/ids";
import { BookingError, canActForPatient, nextInvoiceNumber } from "./booking";
import { visibleForLocation, type PatientLocation } from "./doctors";
import { pickGateway, stripeCreateCheckout } from "./payments/gateways";
import { notifyUser } from "./notify";
import { getRates } from "./queries/reference";
import { convertFromInr } from "@/lib/pricing";
import type { Currency } from "@/config/currencies";

export const SECOND_OPINION_FEE_INR = 150000; // ₹1,500

/** Senior specialists who give second opinions and may do so for this location. */
export async function secondOpinionDoctors(specialtyId: string, loc: PatientLocation) {
  const db = await getDb();
  return db
    .select()
    .from(doctors)
    .where(and(eq(doctors.specialtyId, specialtyId), eq(doctors.offersSecondOpinion, true), visibleForLocation(loc)))
    .orderBy(asc(sql`(select count(*) from ${secondOpinions} s where s.doctor_id = ${doctors.id} and s.status = 'assigned')`), sql`${doctors.experienceYears} desc`);
}

export async function createSecondOpinion(input: { userId: string; patientId: string; specialtySlug: string; question: string; history: string; documentIds: string[]; location: PatientLocation; currency: Currency }) {
  const db = await getDb();
  const access = await canActForPatient(db, input.userId, input.patientId, "book");
  if (!access.ok) throw new BookingError("not_allowed", "You can't request this for that person");
  const [spec] = await db.select().from(specialties).where(eq(specialties.slug, input.specialtySlug));
  if (!spec) throw new BookingError("not_found", "Specialty not found");
  const docs = await secondOpinionDoctors(spec.id, input.location);
  if (!docs.length) throw new BookingError("not_licensed", "No senior specialist can give an opinion for that location");
  const rates = await getRates();
  const fee = convertFromInr(SECOND_OPINION_FEE_INR, input.currency, rates[input.currency]?.rate ?? 1);
  const [so] = await db
    .insert(secondOpinions)
    .values({
      ref: refs.secondOpinion(),
      patientId: input.patientId,
      requestedByUserId: input.userId,
      specialtyId: spec.id,
      patientLocationCountry: input.location.country,
      patientLocationRegion: input.location.region,
      question: input.question,
      history: input.history,
      documentIds: input.documentIds,
      currency: input.currency,
      feeMinor: fee,
    })
    .returning();
  const gateway = pickGateway(input.currency);
  if (gateway === "demo" && !env.demoMode) throw new BookingError("bad_state", "Online payments are not set up yet.");
  const [u] = await db.select().from(users).where(eq(users.id, input.userId));
  const [payment] = await db
    .insert(payments)
    .values({ userId: input.userId, patientId: input.patientId, secondOpinionId: so!.id, purpose: "second_opinion", gateway, currency: input.currency, amountMinor: fee, feeMinor: fee, billing: { name: u?.name ?? "", email: u?.email ?? undefined, country: u?.countryCode ?? "IN" } })
    .returning();
  if (gateway === "stripe") {
    const s = await stripeCreateCheckout({ paymentId: payment!.id, amountMinor: fee, currency: input.currency, description: `${brand.name} second opinion (${so!.ref})`, email: u?.email, successPath: `/second-opinion/${so!.id}?paid=1`, cancelPath: "/second-opinion" });
    return { so: so!, url: s.url };
  }
  return { so: so!, url: `/pay/${payment!.id}` };
}

export async function captureSecondOpinionPayment(paymentId: string, gatewayPaymentId: string, method: string) {
  const db = await getDb();
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!p || p.status === "captured" || !p.secondOpinionId) return;
  await db
    .update(payments)
    .set({ status: "captured", gatewayPaymentId, method, capturedAt: new Date(), invoiceNumber: await nextInvoiceNumber(db), invoiceIssuedAt: new Date(), payoutState: "held" })
    .where(eq(payments.id, p.id));
  const [so] = await db.select().from(secondOpinions).where(eq(secondOpinions.id, p.secondOpinionId));
  if (!so) return;
  const docs = await secondOpinionDoctors(so.specialtyId, { country: so.patientLocationCountry, region: so.patientLocationRegion });
  const doctor = docs[0];
  await db
    .update(secondOpinions)
    .set({ status: doctor ? "assigned" : "submitted", doctorId: doctor?.id ?? null, dueAt: new Date(Date.now() + 48 * 3600_000) })
    .where(eq(secondOpinions.id, so.id));
  if (doctor?.userId) await notifyUser(db, doctor.userId, { template: "second_opinion_assigned", title: "New second opinion request", body: `Case ${so.ref}: please reply within 48 hours.`, link: `/doctor/second-opinions/${so.id}` });
  await notifyUser(db, so.requestedByUserId, { template: "second_opinion_submitted", title: "Second opinion requested", body: doctor ? `${doctor.fullName} will reply within 48 hours.` : "We'll assign a senior specialist shortly.", link: `/second-opinion/${so.id}` });
}
