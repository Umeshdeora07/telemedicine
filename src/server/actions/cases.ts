"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { addCaseNote, assignCase, CaseError, createCase, issueVisaLetter, postCaseMessage, respondToEstimate, sendEstimate, updateCaseStatus, updateTravel, type CaseStatus } from "@/server/cases";
import { startCasePayment } from "@/server/cases-payments";
import { CURRENCY_CODES, type Currency } from "@/config/currencies";
import { getDb } from "@/db";
import { internationalCases } from "@/db/schema";
import { eq } from "drizzle-orm";

export type CaseFormState = { ok?: boolean; error?: string; message?: string };

async function wrap(fn: () => Promise<unknown>, paths: string[]): Promise<CaseFormState> {
  const t = await getT();
  try {
    await fn();
    for (const p of paths) revalidatePath(p);
    return { ok: true };
  } catch (e) {
    if (e instanceof CaseError) return { error: t(e.message) };
    if (e instanceof z.ZodError) return { error: t("Please check the highlighted details and try again.") };
    throw e;
  }
}

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/\n|;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);

const staffPaths = (id: string) => [`/clinic/cases/${id}`, `/coordinator/cases/${id}`, `/international/cases/${id}`];

export async function createCaseAction(_prev: CaseFormState, form: FormData): Promise<CaseFormState> {
  const t = await getT();
  const user = await requireUser({ roles: ["patient", "caregiver"] });
  const v = z
    .object({
      patientId: z.string().uuid(),
      homeCountry: z.string().regex(/^[A-Z]{2}$/),
      currency: z.enum(CURRENCY_CODES as [Currency, ...Currency[]]),
      specialtyId: z.string().uuid().optional().or(z.literal("")),
      treatmentInterest: z.string().min(3).max(200),
      description: z.string().min(20).max(4000),
      preferredClinicId: z.string().uuid().optional().or(z.literal("")),
      preferredLanguage: z.string().max(10).optional(),
      consent: z.literal("on"),
    })
    .safeParse(Object.fromEntries(form));
  if (!v.success) return { error: t("Please fill the treatment, a short description (at least a few sentences) and agree to share your reports.") };
  let id: string;
  try {
    const c = await createCase(user, { ...v.data, specialtyId: v.data.specialtyId || null, preferredClinicId: v.data.preferredClinicId || null, preferredLanguage: v.data.preferredLanguage || null, documentIds: form.getAll("documentIds").map(String).slice(0, 30) });
    id = c.id;
  } catch (e) {
    if (e instanceof CaseError) return { error: t(e.message) };
    throw e;
  }
  redirect(`/international/cases/${id}?new=1`);
}

export async function assignCaseAction(_prev: CaseFormState, form: FormData): Promise<CaseFormState> {
  const user = await requireUser({ roles: ["clinic_coordinator", "care_coordinator", "super_admin"] });
  const id = String(form.get("caseId"));
  return wrap(() => assignCase(user, id, { clinicId: String(form.get("clinicId") || "") || null, doctorId: String(form.get("doctorId") || "") || null, note: String(form.get("note") || "") }), staffPaths(id));
}

export async function sendEstimateAction(_prev: CaseFormState, form: FormData): Promise<CaseFormState> {
  const user = await requireUser({ roles: ["clinic_coordinator", "care_coordinator", "super_admin"] });
  const id = String(form.get("caseId"));
  const num = (k: string) => Number(String(form.get(k) ?? "").replace(/[, ]/g, ""));
  return wrap(async () => {
    const e = z
      .object({
        recommendedTreatment: z.string().min(3).max(300),
        rationale: z.string().max(4000),
        hospitalDays: z.number().int().min(0).max(120),
        indiaDays: z.number().int().min(1).max(180),
        costMinInr: z.number().positive().max(100_000_000),
        costMaxInr: z.number().positive().max(100_000_000),
        depositInr: z.number().min(0).max(100_000_000),
        validDays: z.number().int().min(7).max(180),
      })
      .refine((x) => x.costMaxInr >= x.costMinInr)
      .parse({ recommendedTreatment: String(form.get("recommendedTreatment") ?? ""), rationale: String(form.get("rationale") ?? ""), hospitalDays: num("hospitalDays"), indiaDays: num("indiaDays"), costMinInr: num("costMinInr"), costMaxInr: num("costMaxInr"), depositInr: num("depositInr"), validDays: num("validDays") || 30 });
    await sendEstimate(user, id, { ...e, inclusions: lines(form.get("inclusions")), exclusions: lines(form.get("exclusions")), documentsNeeded: lines(form.get("documentsNeeded")), doctorId: String(form.get("doctorId") || "") || null });
  }, staffPaths(id));
}

export async function issueVisaLetterAction(_prev: CaseFormState, form: FormData): Promise<CaseFormState> {
  const user = await requireUser({ roles: ["clinic_coordinator", "care_coordinator", "super_admin"] });
  const id = String(form.get("caseId"));
  const passport = z.string().regex(/^[A-Z0-9]{6,12}$/i);
  return wrap(async () => {
    const attendants = [0, 1]
      .map((i) => ({ name: String(form.get(`att${i}Name`) ?? "").trim(), relationship: String(form.get(`att${i}Rel`) ?? "").trim(), passportNumber: String(form.get(`att${i}Passport`) ?? "").trim().toUpperCase(), nationality: String(form.get(`att${i}Nationality`) ?? "").trim() }))
      .filter((a) => a.name);
    for (const a of attendants) passport.parse(a.passportNumber);
    await issueVisaLetter(user, id, {
      passportNumber: passport.parse(String(form.get("passportNumber") ?? "").trim()).toUpperCase(),
      nationality: z.string().min(2).max(60).parse(String(form.get("nationality") ?? "").trim()),
      treatment: z.string().min(3).max(300).parse(String(form.get("treatment") ?? "").trim()),
      expectedAdmission: String(form.get("expectedAdmission") || "") || null,
      expectedDays: Number(form.get("expectedDays")) || null,
      attendants,
    });
  }, staffPaths(id));
}

export async function caseStatusAction(_prev: CaseFormState, form: FormData): Promise<CaseFormState> {
  const user = await requireUser({ roles: ["clinic_coordinator", "care_coordinator", "super_admin"] });
  const id = String(form.get("caseId"));
  const status = String(form.get("status") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, 2000);
  const visible = form.get("visibleToPatient") === "on";
  return wrap(() => (status ? updateCaseStatus(user, id, status as CaseStatus, note, visible) : addCaseNote(user, id, note, visible)), staffPaths(id));
}

export async function caseMessageAction(caseId: string, body: string): Promise<CaseFormState> {
  const user = await requireUser();
  return wrap(() => postCaseMessage(user, caseId, body), staffPaths(caseId));
}

export async function respondEstimateAction(estimateId: string, caseId: string, accept: boolean): Promise<CaseFormState> {
  const user = await requireUser({ roles: ["patient", "caregiver"] });
  return wrap(() => respondToEstimate(user, estimateId, accept), staffPaths(caseId));
}

export async function travelAction(_prev: CaseFormState, form: FormData): Promise<CaseFormState> {
  const user = await requireUser();
  const id = String(form.get("caseId"));
  const s = (k: string) => String(form.get(k) ?? "").trim().slice(0, 300) || undefined;
  return wrap(
    () =>
      updateTravel(user, id, {
        arrivalDate: s("arrivalDate"),
        departureDate: s("departureDate"),
        airportPickup: { requested: form.get("pickup") === "on", flight: s("flight") },
        stay: { option: s("stay") },
        localSim: form.get("localSim") === "on",
        interpreterLanguage: s("interpreterLanguage"),
        foodPreferences: s("food"),
        notes: s("notes"),
      }),
    staffPaths(id),
  );
}

export async function payCaseDepositAction(caseId: string) {
  const user = await requireUser({ roles: ["patient", "caregiver"] });
  const db = await getDb();
  const [c] = await db.select().from(internationalCases).where(eq(internationalCases.id, caseId));
  if (!c?.depositMinor || c.createdByUserId !== user.id) return { error: "Not allowed." };
  const r = await startCasePayment(caseId, user.id, "case_deposit", c.depositMinor, c.currency);
  if (r.kind === "redirect") redirect(r.url);
  return r;
}
