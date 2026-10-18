"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { requireUser, destroySession } from "@/server/auth/session";
import * as app from "@/server/patient-app";
import { BookingError } from "@/server/booking";

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
    ["/profile"],
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
