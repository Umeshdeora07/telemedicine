"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { addConsultAction, checkRx, confirmIdentity, ConsultError, endConsult, issuePrescription, saveNotes, setRunningLate, type RxItemInput } from "@/server/consult";
import { getRoomAccess, postRoomMessage } from "@/server/room";

const notesSchema = z.object({
  complaint: z.string().max(4000).default(""),
  history: z.string().max(8000).default(""),
  findings: z.string().max(8000).default(""),
  diagnosis: z.string().max(1000).default(""),
  provisional: z.boolean().default(true),
  advice: z.string().max(8000).default(""),
  investigations: z.array(z.string().max(200)).max(30).default([]),
  warningSigns: z.string().max(2000).default(""),
  patientSummary: z.string().max(4000).default(""),
  privateNotes: z.string().max(8000).default(""),
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
});

async function run<T>(fn: () => Promise<T>) {
  const t = await getT();
  try {
    return { ok: true as const, data: await fn() };
  } catch (e) {
    if (e instanceof ConsultError) return { ok: false as const, error: t(e.message) };
    console.error(e);
    return { ok: false as const, error: t("Something went wrong. Please try again.") };
  }
}

export async function saveNotesAction(apptId: string, input: unknown) {
  const user = await requireUser({ roles: ["doctor"] });
  const n = notesSchema.parse(input);
  return run(() => saveNotes(user, apptId, n));
}

export async function confirmIdentityAction(apptId: string, input: { guardianName?: string; guardianRelationship?: string; explicitConsent?: boolean }) {
  const user = await requireUser({ roles: ["doctor"] });
  const r = await run(() => confirmIdentity(user, apptId, input));
  revalidatePath(`/consult/${apptId}`);
  return r;
}

const itemSchema = z.object({
  medicineId: z.string().uuid().nullable(),
  name: z.string().min(1).max(200),
  form: z.string().max(40),
  strength: z.string().max(60),
  dose: z.string().min(1).max(80),
  frequency: z.string().min(1).max(20),
  timing: z.string().max(30),
  durationDays: z.number().int().min(1).max(365),
  instructions: z.string().max(400),
  tpgList: z.enum(["O", "A", "B", "prohibited"]).optional(),
});

export async function checkRxAction(apptId: string, items: unknown) {
  await requireUser({ roles: ["doctor"] });
  const parsed = z.array(itemSchema).max(20).parse(items) as RxItemInput[];
  return run(async () => {
    const r = await checkRx(apptId, parsed);
    return r.checks.map((c) => ({ ...c, tpgList: r.resolved[c.index]!.tpgList }));
  });
}

export async function issueRxAction(apptId: string, input: unknown) {
  const user = await requireUser({ roles: ["doctor"] });
  const v = z
    .object({
      diagnosis: z.string().max(1000),
      provisional: z.boolean(),
      advice: z.string().max(8000),
      investigations: z.array(z.string().max(200)).max(30),
      followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      items: z.array(itemSchema).max(20),
      acknowledgedWarnings: z.boolean(),
    })
    .parse(input);
  const r = await run(async () => {
    const rx = await issuePrescription(user, apptId, { ...v, items: v.items as RxItemInput[] });
    const access = await getRoomAccess(apptId);
    if (access) await postRoomMessage(access, "The doctor has sent your digital prescription. You'll find it in your consult summary.", null, "system");
    return { id: rx.id, number: rx.number };
  });
  revalidatePath(`/consult/${apptId}`);
  return r;
}

export async function addActionAction(apptId: string, type: "in_person_visit" | "specialist_referral" | "tests" | "emergency" | "follow_up", details: Record<string, unknown>) {
  const user = await requireUser({ roles: ["doctor"] });
  const d = z
    .object({
      reason: z.string().max(500).optional(),
      urgency: z.string().max(20).optional(),
      tests: z.array(z.string().max(100)).max(20).optional(),
      specialtySlug: z.string().max(60).optional(),
      clinicId: z.string().uuid().nullable().optional(),
      dueInDays: z.number().int().min(0).max(180).optional(),
      followUpMode: z.string().max(20).optional(),
    })
    .parse(details);
  const r = await run(async () => {
    const a = await addConsultAction(user, apptId, type, d);
    const access = await getRoomAccess(apptId);
    const msg: Record<string, string> = {
      in_person_visit: "The doctor recommends a clinic visit. You can book it in one tap after this call.",
      specialist_referral: "The doctor recommends seeing a specialist.",
      tests: "The doctor has ordered tests. You can book them after the call.",
      emergency: "The doctor advises you to go to a hospital emergency department now.",
      follow_up: "The doctor would like a follow up consult.",
    };
    if (access) await postRoomMessage(access, msg[type]!, null, "system");
    if (type === "emergency") await endConsult(user, apptId, "emergency");
    return { id: a.id };
  });
  revalidatePath(`/consult/${apptId}`);
  return r;
}

export async function endConsultAction(apptId: string, outcome: "completed" | "needs_in_person" | "referred" | "ended_early") {
  const user = await requireUser({ roles: ["doctor"] });
  const r = await run(() => endConsult(user, apptId, outcome));
  revalidatePath("/doctor");
  return r.ok ? { ok: true as const } : r;
}

export async function runningLateAction(minutes: number) {
  const user = await requireUser({ roles: ["doctor"] });
  await setRunningLate(user, minutes);
  revalidatePath("/doctor");
}
