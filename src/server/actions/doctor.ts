"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { availabilityRules, availabilitySlots, documents, doctorFees, doctorLicences, doctorQualifications, doctors, specialties } from "@/db/schema";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { doctorForUser } from "@/server/consult";
import { clearOpenSlotsForRules, materializeSlots } from "@/lib/slots";
import { isValidTimeZone } from "@/lib/time";
import { audit } from "@/server/audit";
import { CURRENCY_CODES } from "@/config/currencies";
import { isRegistrationCouncil } from "@/config/councils";
import { missingForVerification } from "@/server/doctor-verification";
import { notifyUser } from "@/server/notify";
import { confirmDirectPayment, markDirectRefundSent, rejectDirectPayment } from "@/server/booking";
import type { FeeItem, PaymentDetails } from "@/lib/direct-payment";

async function me() {
  const user = await requireUser({ roles: ["doctor"] });
  const d = await doctorForUser(user);
  if (!d) throw new Error("No doctor profile");
  return { user, d };
}

const csv = (s: unknown) =>
  String(s ?? "")
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 30);

export type FormState = { ok?: boolean; error?: string };

export async function saveProfileAction(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  const { user, d } = await me();
  const v = z
    .object({
      headline: z.string().max(140),
      about: z.string().max(3000),
      languages: z.array(z.string().min(2).max(5)).min(1),
      modes: z.array(z.enum(["video", "audio", "chat", "in_clinic"])).min(1),
      consultMinutes: z.coerce.number().int().min(5).max(90),
      chatResponseMinutes: z.coerce.number().int().min(5).max(2880),
      followUpChatDays: z.coerce.number().int().min(0).max(14),
      timeZone: z.string().refine(isValidTimeZone),
      creditOnlineFeeToClinic: z.boolean(),
      videoIntroUrl: z.string().url().or(z.literal("")),
    })
    .safeParse({
      headline: form.get("headline"),
      about: form.get("about"),
      languages: form.getAll("languages"),
      modes: form.getAll("modes"),
      consultMinutes: form.get("consultMinutes"),
      chatResponseMinutes: form.get("chatResponseMinutes"),
      followUpChatDays: form.get("followUpChatDays"),
      timeZone: form.get("timeZone"),
      creditOnlineFeeToClinic: false,
      videoIntroUrl: "",
    });
  if (!v.success) return { error: t("Please check the highlighted fields.") };
  const db = await getDb();
  await db
    .update(doctors)
    .set({
      ...v.data,
      videoIntroUrl: v.data.videoIntroUrl || null,
      subSpecialties: csv(form.get("subSpecialties")),
      conditionsTreated: csv(form.get("conditionsTreated")),
      procedures: csv(form.get("procedures")),
      memberships: csv(form.get("memberships")),
      publications: csv(form.get("publications")),
    })
    .where(eq(doctors.id, d.id));
  const photo = form.get("photoDocumentId");
  if (typeof photo === "string" && /^[0-9a-f-]{36}$/.test(photo)) {
    const [doc] = await db.select().from(documents).where(and(eq(documents.id, photo), eq(documents.doctorId, d.id), eq(documents.category, "photo")));
    if (doc && ["image/jpeg", "image/png", "image/webp"].includes(doc.mimeType)) await db.update(doctors).set({ photoUrl: `/api/doctor-photos/${doc.id}` }).where(eq(doctors.id, d.id));
  }
  const sig = form.get("signatureDocumentId");
  if (typeof sig === "string" && /^[0-9a-f-]{36}$/.test(sig)) {
    const [doc] = await db.select().from(documents).where(and(eq(documents.id, sig), eq(documents.doctorId, d.id)));
    if (doc) await db.update(doctors).set({ signatureDocumentId: doc.id }).where(eq(doctors.id, d.id));
  }
  await audit({ actor: { id: user.id, role: user.role }, action: "doctor.profile_update", entityType: "doctor", entityId: d.id });
  revalidatePath("/doctor/profile");
  revalidatePath(`/doctors/${d.slug}`);
  return { ok: true };
}

export async function saveFeesAction(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  const { user, d } = await me();
  const rows: (typeof doctorFees.$inferInsert)[] = [];
  for (const [k, v] of form.entries()) {
    const m = /^fee:(video|audio|chat|in_clinic):([A-Z]{3})$/.exec(k);
    if (!m || v === "") continue;
    const amount = Number(v);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) return { error: t("Fees must be numbers.") };
    if (!CURRENCY_CODES.includes(m[2] as never)) continue;
    rows.push({ doctorId: d.id, mode: m[1] as "video", currency: m[2]!, amountMinor: Math.round(amount * 100) });
  }
  if (!rows.some((r) => r.currency === "INR")) return { error: t("Please set at least one fee in INR.") };
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(doctorFees).where(eq(doctorFees.doctorId, d.id));
    await tx.insert(doctorFees).values(rows);
  });
  await audit({ actor: { id: user.id, role: user.role }, action: "doctor.fees_update", entityType: "doctor", entityId: d.id, metadata: { count: rows.length } });
  revalidatePath("/doctor/profile");
  return { ok: true };
}

const ruleSchema = z.object({
  group: z.enum(["online", "in_clinic"]),
  clinicId: z.string().uuid().nullable(),
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotMinutes: z.number().int().min(5).max(120),
});

/** Replace the weekly availability and regenerate free slots (booked slots stay). */
export async function saveRulesAction(input: unknown, timeZone: string) {
  const t = await getT();
  const { user, d } = await me();
  const parsed = z.array(ruleSchema).max(80).safeParse(input);
  if (!parsed.success || !isValidTimeZone(timeZone)) return { ok: false as const, error: t("Please check the times.") };
  for (const r of parsed.data) if (r.endTime <= r.startTime) return { ok: false as const, error: t("End time must be after start time.") };
  // Online and in-clinic hours must not overlap: a doctor can't be in two places.
  for (const a of parsed.data)
    for (const b of parsed.data)
      if (a !== b && a.weekday === b.weekday && a.group !== b.group && a.startTime < b.endTime && b.startTime < a.endTime)
        return { ok: false as const, error: t("Online and clinic hours overlap on the same day.") };
  const db = await getDb();
  const old = await db.select({ id: availabilityRules.id }).from(availabilityRules).where(eq(availabilityRules.doctorId, d.id));
  await clearOpenSlotsForRules(db, old.map((o) => o.id));
  await db.delete(availabilityRules).where(eq(availabilityRules.doctorId, d.id));
  if (parsed.data.length) await db.insert(availabilityRules).values(parsed.data.map((r) => ({ ...r, doctorId: d.id, timeZone })));
  await db.update(doctors).set({ timeZone }).where(eq(doctors.id, d.id));
  const n = await materializeSlots(db, { doctorId: d.id, days: 21 });
  await audit({ actor: { id: user.id, role: user.role }, action: "doctor.availability_update", entityType: "doctor", entityId: d.id, metadata: { rules: parsed.data.length, slots: n } });
  revalidatePath("/doctor/schedule");
  return { ok: true as const };
}

export async function toggleSlotBlockAction(slotId: string, block: boolean) {
  const { d } = await me();
  const db = await getDb();
  await db
    .update(availabilitySlots)
    .set({ status: block ? "blocked" : "open" })
    .where(and(eq(availabilitySlots.id, slotId), eq(availabilitySlots.doctorId, d.id), inArray(availabilitySlots.status, block ? ["open"] : ["blocked"])));
  revalidatePath("/doctor/schedule");
}

/* ------------------------------------------------------------ onboarding */

export async function saveOnboardingAction(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  const { user, d } = await me();
  const db = await getDb();
  const v = z
    .object({ fullName: z.string().min(3).max(100), gender: z.enum(["female", "male", "other"]), specialty: z.string(), experienceYears: z.coerce.number().int().min(0).max(70) })
    .safeParse({ fullName: form.get("fullName"), gender: form.get("gender"), specialty: form.get("specialty"), experienceYears: form.get("experienceYears") });
  if (!v.success) return { error: t("Please fill your name, gender, specialty and experience.") };
  const [spec] = await db.select().from(specialties).where(eq(specialties.slug, v.data.specialty));
  if (!spec) return { error: t("Choose a specialty.") };
  await db.update(doctors).set({ fullName: v.data.fullName, gender: v.data.gender === "other" ? "female" : v.data.gender, specialtyId: spec.id, experienceYears: v.data.experienceYears }).where(eq(doctors.id, d.id));
  await audit({ actor: { id: user.id, role: user.role }, action: "doctor.onboarding_update", entityType: "doctor", entityId: d.id });
  revalidatePath("/doctor/onboarding");
  return { ok: true };
}

export async function addQualificationAction(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  const { d } = await me();
  const v = z.object({ degree: z.string().min(2).max(80), institution: z.string().min(2).max(160), year: z.coerce.number().int().min(1950).max(new Date().getFullYear()), documentId: z.string().uuid().optional().or(z.literal("")) }).safeParse(Object.fromEntries(form));
  if (!v.success) return { error: t("Please enter degree, institution and year.") };
  const db = await getDb();
  await db.insert(doctorQualifications).values({ doctorId: d.id, degree: v.data.degree, institution: v.data.institution, year: v.data.year, documentId: v.data.documentId || null });
  revalidatePath("/doctor/onboarding");
  return { ok: true };
}

export async function addLicenceAction(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  const { user, d } = await me();
  const v = z
    .object({
      number: z.string().trim().min(3).max(60),
      issuingBody: z.string().refine(isRegistrationCouncil),
      expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
      certificateDocumentId: z.string().uuid(),
    })
    .safeParse(Object.fromEntries(form));
  if (!v.success) return { error: t("Please choose your council, enter the registration number and upload the registration certificate.") };
  const db = await getDb();
  const [cert] = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.id, v.data.certificateDocumentId), eq(documents.doctorId, d.id)));
  if (!cert) return { error: t("Please upload the registration certificate.") };
  // Every doctor on the platform is registered in India.
  await db.insert(doctorLicences).values({
    doctorId: d.id,
    country: "IN",
    region: null,
    number: v.data.number,
    issuingBody: v.data.issuingBody,
    expiresAt: v.data.expiresAt || null,
    certificateDocumentId: cert.id,
    status: "pending",
  });
  await audit({ actor: { id: user.id, role: user.role }, action: "doctor.licence_added", entityType: "doctor", entityId: d.id, metadata: { country: "IN" } });
  revalidatePath("/doctor/onboarding");
  revalidatePath("/doctor/licences");
  return { ok: true };
}

export async function submitForVerificationAction(): Promise<FormState> {
  const t = await getT();
  const { user, d } = await me();
  const db = await getDb();
  const missing = await missingForVerification(db, d, t);
  if (missing.length) return { error: t("Still needed: {items}.", { items: missing.join(", ") }) };
  await db.update(doctors).set({ verificationStatus: "submitted", submittedAt: new Date() }).where(eq(doctors.id, d.id));
  await audit({ actor: { id: user.id, role: user.role }, action: "doctor.submitted", entityType: "doctor", entityId: d.id });
  revalidatePath("/doctor/onboarding");
  return { ok: true };
}

/* ------------------------------------------------- fees and payment details */

const money = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

/** Treatment and other fees shown on the doctor's profile (rows with a name and a price). */
export async function saveFeeItemsAction(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  const { user, d } = await me();
  const items: FeeItem[] = [];
  for (let i = 0; i < 20; i++) {
    const name = String(form.get(`item-name-${i}`) ?? "").trim().slice(0, 120);
    if (!name) continue;
    const fromMinor = money(form.get(`item-from-${i}`));
    if (!fromMinor) return { error: t("Please enter a price for {name}.", { name }) };
    const toMinor = money(form.get(`item-to-${i}`));
    if (toMinor && toMinor < fromMinor) return { error: t("The highest price for {name} is lower than the lowest price.", { name }) };
    items.push({ name, fromMinor, toMinor, note: String(form.get(`item-note-${i}`) ?? "").trim().slice(0, 200) || undefined });
  }
  const db = await getDb();
  await db.update(doctors).set({ feeItems: items }).where(eq(doctors.id, d.id));
  await audit({ actor: { id: user.id, role: user.role }, action: "doctor.fee_items_update", entityType: "doctor", entityId: d.id, metadata: { count: items.length } });
  revalidatePath("/doctor/profile");
  revalidatePath(`/doctors/${d.slug}`);
  return { ok: true };
}

/** The doctor's own UPI and bank details. Patients pay the doctor directly. */
export async function savePaymentDetailsAction(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  const { user, d } = await me();
  const text = (k: string, max = 80) => String(form.get(k) ?? "").trim().slice(0, max) || undefined;
  const next: PaymentDetails = {
    upiId: text("upiId"),
    accountName: text("accountName", 120),
    bankName: text("bankName", 120),
    accountNumber: text("accountNumber", 34)?.replace(/\s/g, ""),
    ifsc: text("ifsc", 11)?.toUpperCase(),
    swift: text("swift", 11)?.toUpperCase(),
    notes: text("notes", 400),
    qrDocumentId: d.paymentDetails?.qrDocumentId,
  };
  if (next.upiId && !/^[\w.\-]{2,256}@[a-zA-Z][a-zA-Z0-9.\-]{1,63}$/.test(next.upiId)) return { error: t("Please check your UPI ID. It looks like name@bank.") };
  if (next.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(next.ifsc)) return { error: t("Please check the IFSC code. It has 11 characters, like SBIN0001234.") };
  if (next.swift && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(next.swift)) return { error: t("Please check the SWIFT code. It has 8 or 11 characters.") };
  if (next.accountNumber && !/^\d{6,20}$/.test(next.accountNumber)) return { error: t("Please check the account number.") };
  if ((next.accountNumber || next.ifsc) && !(next.accountName && next.accountNumber && next.ifsc)) return { error: t("For bank transfer, please fill in the account holder name, account number and IFSC code.") };
  const db = await getDb();
  const qr = form.get("qrDocumentId");
  if (typeof qr === "string" && /^[0-9a-f-]{36}$/.test(qr)) {
    const [doc] = await db.select().from(documents).where(and(eq(documents.id, qr), eq(documents.doctorId, d.id)));
    if (!doc || !["image/jpeg", "image/png", "image/webp"].includes(doc.mimeType)) return { error: t("Please upload the QR code as a JPG or PNG image.") };
    next.qrDocumentId = doc.id;
  }
  if (form.get("removeQr") === "1") next.qrDocumentId = undefined;
  if (!next.upiId && !next.qrDocumentId && !next.accountNumber) return { error: t("Please add a UPI ID, a UPI QR code or bank account details, so patients can pay you.") };
  await db.update(doctors).set({ paymentDetails: next }).where(eq(doctors.id, d.id));
  await audit({ actor: { id: user.id, role: user.role }, action: "doctor.payment_details_update", entityType: "doctor", entityId: d.id });
  // A change of where money goes is worth a heads up, in case someone else is using the account.
  if (d.paymentDetails && d.userId)
    await notifyUser(db, d.userId, {
      template: "payment_details_changed",
      title: "Your payment details were changed",
      body: "Patients will now pay to the new details. If you did not make this change, contact us at once.",
      link: "/doctor/profile",
    });
  revalidatePath("/doctor/profile");
  revalidatePath("/doctor/onboarding");
  return { ok: true };
}

export async function confirmPaymentAction(paymentId: string): Promise<FormState> {
  const t = await getT();
  const { user } = await me();
  try {
    await confirmDirectPayment(user.id, paymentId);
  } catch (e) {
    return { error: t((e as Error).message) };
  }
  revalidatePath("/doctor/payments");
  revalidatePath("/doctor");
  return { ok: true };
}

export async function rejectPaymentAction(paymentId: string, reason: string): Promise<FormState> {
  const t = await getT();
  const { user } = await me();
  try {
    await rejectDirectPayment(user.id, paymentId, reason.trim().slice(0, 300));
  } catch (e) {
    return { error: t((e as Error).message) };
  }
  revalidatePath("/doctor/payments");
  revalidatePath("/doctor");
  return { ok: true };
}

export async function markRefundSentAction(refundId: string): Promise<FormState> {
  const t = await getT();
  const { user } = await me();
  try {
    await markDirectRefundSent(user.id, refundId);
  } catch (e) {
    return { error: t((e as Error).message) };
  }
  revalidatePath("/doctor/payments");
  return { ok: true };
}
