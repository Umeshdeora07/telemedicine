"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { appointments, consents, patients, recordAccessGrants } from "@/db/schema";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { canActForPatient } from "@/server/booking";
import { audit } from "@/server/audit";
import { ageFrom } from "@/lib/utils";

export type PrepState = { error?: string; saved?: boolean };

const schema = z.object({
  apptId: z.string().uuid(),
  mainProblem: z.string().trim().min(3).max(2000),
  since: z.string().trim().max(200),
  currentMedicines: z.string().max(2000),
  allergies: z.string().max(1000),
  pastConditions: z.string().max(2000),
  questions: z.string().max(2000).optional(),
  shareHistory: z.literal("on").optional(),
  updateProfile: z.literal("on").optional(),
  consent: z.literal("on"),
  guardianName: z.string().max(100).optional(),
  guardianRelationship: z.string().max(50).optional(),
});

const splitList = (s: string) =>
  s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter((x) => x && !/^(none|no|nil|na|n\/a)$/i.test(x));

export async function savePreConsultAction(_prev: PrepState, form: FormData): Promise<PrepState> {
  const t = await getT();
  const user = await requireUser();
  const flags = form.getAll("redFlags").map(String);
  const apptId = String(form.get("apptId"));
  if (flags.length) redirect(`/emergency?flags=${flags.join(",")}&from=preconsult&appt=${apptId}`);
  const parsed = schema.safeParse(Object.fromEntries([...form.entries()].filter(([k]) => k !== "redFlags" && k !== "documentIds")));
  if (!parsed.success) {
    const missingConsent = parsed.error.issues.some((i) => i.path[0] === "consent");
    return { error: missingConsent ? t("Please tick the consent box to continue.") : t("Please tell the doctor the main problem (a few words is fine).") };
  }
  const v = parsed.data;
  const db = await getDb();
  const [appt] = await db.select().from(appointments).where(eq(appointments.id, v.apptId));
  if (!appt) return { error: t("Booking not found.") };
  const access = await canActForPatient(db, user.id, appt.patientId, "join");
  if (!access.ok) return { error: t("You can't update this booking.") };
  const [patient] = await db.select().from(patients).where(eq(patients.id, appt.patientId));
  const minor = (ageFrom(patient?.dob) ?? 99) < 18;
  if (minor && !v.guardianName) return { error: t("Please tell us which parent or guardian will be present.") };

  const documentIds = form.getAll("documentIds").map(String).filter((x) => /^[0-9a-f-]{36}$/.test(x));
  await db
    .update(appointments)
    .set({
      chiefComplaint: v.mainProblem.slice(0, 200),
      preConsult: {
        mainProblem: v.mainProblem,
        since: v.since,
        currentMedicines: v.currentMedicines,
        allergies: v.allergies,
        pastConditions: v.pastConditions,
        questions: v.questions,
        shareHistory: v.shareHistory === "on",
        documentIds,
        consentGiven: true,
        submittedAt: new Date().toISOString(),
      },
      guardianPresent: minor && v.guardianName ? { name: v.guardianName, relationship: v.guardianRelationship ?? "Parent" } : null,
    })
    .where(eq(appointments.id, appt.id));

  if (v.updateProfile === "on" && patient) {
    await db
      .update(patients)
      .set({ allergies: splitList(v.allergies), currentMedicines: splitList(v.currentMedicines), conditions: splitList(v.pastConditions) })
      .where(eq(patients.id, patient.id));
  }
  if (v.shareHistory === "on") {
    const [existing] = await db.select().from(recordAccessGrants).where(and(eq(recordAccessGrants.patientId, appt.patientId), eq(recordAccessGrants.doctorId, appt.doctorId), eq(recordAccessGrants.appointmentId, appt.id)));
    if (!existing) {
      await db.insert(recordAccessGrants).values({
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        appointmentId: appt.id,
        grantedByUserId: user.id,
        expiresAt: new Date(appt.startAt.getTime() + 30 * 86400_000),
      });
      await db.insert(consents).values({ userId: user.id, patientId: appt.patientId, appointmentId: appt.id, type: "records_sharing", version: "1.0", granted: true, method: "checkbox" });
    }
  }
  await audit({ actor: { id: user.id, role: user.role }, action: "appointment.preconsult", entityType: "appointment", entityId: appt.id, patientId: appt.patientId });
  revalidatePath(`/consults/${appt.id}`);
  return { saved: true };
}
