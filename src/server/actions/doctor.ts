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
      creditOnlineFeeToClinic: form.get("creditOnlineFeeToClinic") === "on",
      videoIntroUrl: form.get("videoIntroUrl") ?? "",
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
      country: z.string().regex(/^[A-Z]{2}$/),
      region: z.string().optional(),
      number: z.string().min(3).max(60),
      issuingBody: z.string().min(3).max(160),
      expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
      certificateDocumentId: z.string().uuid().optional().or(z.literal("")),
    })
    .safeParse(Object.fromEntries(form));
  if (!v.success) return { error: t("Please enter the country, registration number and the council or board.") };
  const db = await getDb();
  await db.insert(doctorLicences).values({
    doctorId: d.id,
    country: v.data.country,
    region: v.data.region || null,
    number: v.data.number.trim(),
    issuingBody: v.data.issuingBody.trim(),
    expiresAt: v.data.expiresAt || null,
    certificateDocumentId: v.data.certificateDocumentId || null,
    status: "pending",
  });
  await audit({ actor: { id: user.id, role: user.role }, action: "doctor.licence_added", entityType: "doctor", entityId: d.id, metadata: { country: v.data.country } });
  revalidatePath("/doctor/onboarding");
  revalidatePath("/doctor/licences");
  return { ok: true };
}

export async function submitForVerificationAction(): Promise<FormState> {
  const t = await getT();
  const { user, d } = await me();
  const db = await getDb();
  const [lic, quals, docs] = await Promise.all([
    db.select().from(doctorLicences).where(eq(doctorLicences.doctorId, d.id)),
    db.select().from(doctorQualifications).where(eq(doctorQualifications.doctorId, d.id)),
    db.select().from(documents).where(eq(documents.doctorId, d.id)),
  ]);
  const has = (c: string) => docs.some((x) => x.category === c && !x.deletedAt);
  const missing = [
    !lic.length && t("a licence"),
    !quals.length && t("a qualification"),
    !has("registration_certificate") && t("registration certificate"),
    !has("degree_certificate") && t("degree certificate"),
    !has("government_id") && t("government ID"),
    !has("selfie") && t("selfie"),
  ].filter(Boolean);
  if (missing.length) return { error: t("Still needed: {items}.", { items: missing.join(", ") }) };
  await db.update(doctors).set({ verificationStatus: "submitted", submittedAt: new Date() }).where(eq(doctors.id, d.id));
  await audit({ actor: { id: user.id, role: user.role }, action: "doctor.submitted", entityType: "doctor", entityId: d.id });
  revalidatePath("/doctor/onboarding");
  return { ok: true };
}
