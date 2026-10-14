"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { requireUser, destroySession } from "@/server/auth/session";
import * as app from "@/server/patient-app";
import { getViewerRegion } from "@/lib/prefs";
import { createSecondOpinion } from "@/server/second-opinion";
import { startPlanPurchase } from "@/server/plans";
import { BookingError } from "@/server/booking";
import type { Currency } from "@/config/currencies";

export type PState = { ok?: boolean; error?: string; url?: string; message?: string; devCode?: string; linkId?: string; urgent?: boolean };

const PATIENT = { roles: ["patient", "caregiver"] as ("patient" | "caregiver")[] };

async function wrap(fn: () => Promise<Partial<PState> | void>, paths: string[]): Promise<PState> {
  const t = await getT();
  try {
    const r = (await fn()) ?? {};
    for (const p of paths) revalidatePath(p);
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof app.PatientError || e instanceof BookingError) return { error: t(e.message) };
    if (e instanceof z.ZodError) return { error: t("Please check the details and try again.") };
    throw e;
  }
}

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const list = (v: string) => v.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 30);

/* records */

export async function shareRecordsAction(_p: PState, f: FormData): Promise<PState> {
  const user = await requireUser(PATIENT);
  return wrap(async () => {
    const r = await app.createShareLink(user, z.string().uuid().parse(s(f, "patientId")), f.getAll("documentIds").map(String), Number(s(f, "days")) || 7, s(f, "note"));
    return { url: r.url };
  }, ["/records"]);
}

export async function revokeShareAction(id: string) {
  const user = await requireUser(PATIENT);
  return wrap(() => app.revokeShareLink(user, id), ["/records"]);
}

export async function revokeGrantAction(id: string) {
  const user = await requireUser(PATIENT);
  return wrap(() => app.revokeGrant(user, id), ["/records"]);
}

export async function linkAbhaAction(_p: PState, f: FormData): Promise<PState> {
  const user = await requireUser(PATIENT);
  return wrap(() => app.linkAbha(user, s(f, "patientId"), s(f, "abha")), ["/records"]);
}

/* family */

export async function addFamilyAction(_p: PState, f: FormData): Promise<PState> {
  const user = await requireUser(PATIENT);
  const t = await getT();
  const v = z
    .object({
      fullName: z.string().min(2).max(100),
      dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      sex: z.enum(["female", "male", "other"]),
      relationship: z.string().min(2).max(40),
      phone: z.string().max(20).optional(),
      country: z.string().regex(/^[A-Z]{2}$/),
    })
    .safeParse(Object.fromEntries(f));
  if (!v.success) return { error: t("Please fill name, date of birth, sex and relationship.") };
  if (v.data.dob > new Date().toISOString().slice(0, 10)) return { error: t("Date of birth can't be in the future.") };
  let linkId = "";
  const r = await wrap(async () => {
    const out = await app.addFamilyMember(user, { ...v.data, phone: v.data.phone ? v.data.phone.replace(/[^\d+]/g, "") : null, guardianDeclaration: f.get("guardian") === "on" });
    linkId = out.link.id;
    if (out.needsConsent) {
      const sent = await app.sendFamilyConsentCode(user, out.link.id);
      return { linkId: out.link.id, devCode: sent.ok ? sent.devCode : undefined, message: sent.ok ? undefined : sent.error };
    }
  }, ["/family"]);
  if (r.ok && !r.linkId) redirect("/family?added=1");
  return { ...r, linkId: r.linkId ?? linkId };
}

export async function resendFamilyCodeAction(linkId: string): Promise<PState> {
  const user = await requireUser(PATIENT);
  const t = await getT();
  try {
    const r = await app.sendFamilyConsentCode(user, linkId);
    return r.ok ? { ok: true, linkId, devCode: r.devCode } : { error: t(r.error), linkId };
  } catch (e) {
    if (e instanceof app.PatientError) return { error: t(e.message), linkId };
    throw e;
  }
}

export async function confirmFamilyAction(_p: PState, f: FormData): Promise<PState> {
  const user = await requireUser(PATIENT);
  const linkId = s(f, "linkId");
  const r = await wrap(() => app.confirmFamilyConsent(user, linkId, s(f, "code")), ["/family"]);
  if (r.ok) redirect("/family?added=1");
  return { ...r, linkId };
}

export async function familyPermsAction(linkId: string, perms: { canBook: boolean; canJoin: boolean; canViewRecords: boolean; receivesNotifications: boolean }) {
  const user = await requireUser(PATIENT);
  return wrap(() => app.setLinkPermissions(user, linkId, perms), ["/family", "/settings"]);
}

export async function revokeFamilyAction(linkId: string) {
  const user = await requireUser(PATIENT);
  return wrap(() => app.revokeLink(user, linkId), ["/family", "/settings"]);
}

/* reminders & readings */

export async function logDoseAction(reminderId: string, at: string, status: "taken" | "skipped") {
  const user = await requireUser(PATIENT);
  return wrap(() => app.logDose(user, reminderId, new Date(at), status), ["/reminders", "/dashboard"]);
}

export async function addReminderAction(_p: PState, f: FormData): Promise<PState> {
  const user = await requireUser(PATIENT);
  const { tz } = await getViewerRegion(user);
  return wrap(
    () =>
      app.addReminder(user, {
        patientId: z.string().uuid().parse(s(f, "patientId")),
        name: z.string().min(2).max(120).parse(s(f, "name")),
        dose: z.string().min(1).max(60).parse(s(f, "dose")),
        times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).max(6).parse(f.getAll("times").map(String).filter(Boolean)),
        days: Number(s(f, "days")) || null,
        instructions: s(f, "instructions").slice(0, 200),
        timeZone: tz,
      }),
    ["/reminders"],
  );
}

export async function remindersFromRxAction(prescriptionId: string) {
  const user = await requireUser(PATIENT);
  const { tz } = await getViewerRegion(user);
  const t = await getT();
  return wrap(async () => {
    const n = await app.remindersFromPrescription(user, prescriptionId, tz);
    return { message: n ? t("{n} reminders added.", { n }) : t("Reminders for this prescription are already set.") };
  }, ["/reminders"]);
}

export async function toggleReminderAction(id: string, active: boolean) {
  const user = await requireUser(PATIENT);
  return wrap(() => app.toggleReminder(user, id, active), ["/reminders"]);
}

export async function addReadingAction(_p: PState, f: FormData): Promise<PState> {
  const user = await requireUser(PATIENT);
  const type = z.enum(Object.keys(app.READING_TYPES) as [app.ReadingType, ...app.ReadingType[]]).parse(s(f, "type"));
  const when = s(f, "takenAt") ? new Date(s(f, "takenAt")) : new Date();
  return wrap(async () => {
    const r = await app.addReading(user, z.string().uuid().parse(s(f, "patientId")), type, Number(s(f, "value")), s(f, "value2") ? Number(s(f, "value2")) : null, when > new Date() ? new Date() : when, s(f, "note").slice(0, 200));
    return { urgent: r.urgent };
  }, ["/health/readings"]);
}

/* emergency card & profile */

export async function emergencyCardAction(patientId: string, on: boolean) {
  const user = await requireUser(PATIENT);
  return wrap(() => app.setEmergencyCard(user, patientId, on).then(() => undefined), ["/emergency-card"]);
}

export async function healthProfileAction(_p: PState, f: FormData): Promise<PState> {
  const user = await requireUser(PATIENT);
  const num = (k: string) => (s(f, k) ? Number(s(f, k)) : null);
  return wrap(
    () =>
      app.updateHealthProfile(user, z.string().uuid().parse(s(f, "patientId")), {
        bloodGroup: s(f, "bloodGroup") || null,
        heightCm: num("heightCm"),
        weightKg: num("weightKg"),
        allergies: list(s(f, "allergies")),
        conditions: list(s(f, "conditions")),
        currentMedicines: list(s(f, "currentMedicines")),
        emergencyContact: s(f, "ecName") && s(f, "ecPhone") ? { name: s(f, "ecName"), phone: s(f, "ecPhone"), relationship: s(f, "ecRel") || undefined } : null,
        preferredLanguage: s(f, "preferredLanguage") || null,
        city: s(f, "city") || null,
      }),
    ["/profile", "/emergency-card"],
  );
}

export async function consentAction(type: (typeof app.OPTIONAL_CONSENTS)[number], granted: boolean) {
  const user = await requireUser(PATIENT);
  return wrap(() => app.setConsent(user, type, granted), ["/settings"]);
}

export async function deleteAccountAction(_p: PState, f: FormData): Promise<PState> {
  const user = await requireUser(PATIENT);
  const t = await getT();
  if (s(f, "confirm").toUpperCase() !== "DELETE") return { error: t("Type DELETE to confirm.") };
  const r = await wrap(() => app.requestDeletion(user, s(f, "reason")), []);
  if (r.error) return r;
  await destroySession();
  redirect("/?deleted=1");
}

/* second opinion & plans */

export async function secondOpinionAction(_p: PState, f: FormData): Promise<PState> {
  const user = await requireUser(PATIENT);
  const t = await getT();
  const v = z
    .object({ patientId: z.string().uuid(), specialty: z.string().min(2), question: z.string().min(20).max(2000), history: z.string().max(4000).optional(), country: z.string().regex(/^[A-Z]{2}$/), region: z.string().optional(), consent: z.literal("on") })
    .safeParse(Object.fromEntries(f));
  if (!v.success) return { error: t("Please choose the person and specialty, write your question (a few sentences), and agree to share your reports.") };
  const docs = f.getAll("documentIds").map(String).slice(0, 20);
  if (!docs.length) return { error: t("Upload at least one report, scan or discharge summary for the doctor to review.") };
  const { currency } = await getViewerRegion(user);
  let url: string;
  try {
    const r = await createSecondOpinion({ userId: user.id, patientId: v.data.patientId, specialtySlug: v.data.specialty, question: v.data.question, history: v.data.history ?? "", documentIds: docs, location: { country: v.data.country, region: v.data.region || null }, currency: currency as Currency });
    url = r.url ?? "/second-opinion";
  } catch (e) {
    if (e instanceof BookingError) return { error: t(e.message) };
    throw e;
  }
  redirect(url);
}

export async function buyPlanAction(_p: PState, f: FormData): Promise<PState> {
  const user = await requireUser(PATIENT);
  const t = await getT();
  const people = f.getAll("patientIds").map(String);
  let url: string | null = null;
  try {
    const r = await startPlanPurchase(user.id, s(f, "plan"), people, s(f, "careDoctorId") || null);
    if (r.kind === "redirect") url = r.url;
    else return { error: t("Card and UPI checkout opens here when Razorpay is connected.") };
  } catch (e) {
    if (e instanceof BookingError) return { error: t(e.message) };
    throw e;
  }
  redirect(url!);
}
