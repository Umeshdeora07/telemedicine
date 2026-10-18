import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb, withRls, type Executor } from "@/db";
import { appointments, clinicStaff, documents, doctors, internationalCases } from "@/db/schema";
import type { SessionUser } from "./auth/session";
import { canActForPatient } from "./booking";
import { audit } from "./audit";

export type DocCategory = (typeof documents.$inferInsert)["category"];

const PATIENT_CATEGORIES: DocCategory[] = ["report", "scan", "photo", "prescription", "discharge", "other", "recording"];
const DOCTOR_CATEGORIES: DocCategory[] = ["registration_certificate", "degree_certificate", "government_id", "selfie", "signature", "photo"];

/** Decide whether this user may attach a file to the given owner. */
export async function canUpload(db: Executor, user: SessionUser, target: { patientId?: string | null; appointmentId?: string | null; caseId?: string | null; category: DocCategory; forDoctor?: boolean }) {
  if (target.forDoctor) {
    if (user.role !== "doctor" && user.role !== "super_admin") return { ok: false as const };
    if (!DOCTOR_CATEGORIES.includes(target.category) && target.category !== "other") return { ok: false as const };
    const [d] = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, user.id));
    return d ? { ok: true as const, doctorId: d.id } : { ok: false as const };
  }
  if (target.caseId) {
    const [c] = await db.select().from(internationalCases).where(eq(internationalCases.id, target.caseId));
    if (!c) return { ok: false as const };
    if (user.role === "clinic_coordinator") {
      const [s] = await db.select().from(clinicStaff).where(and(eq(clinicStaff.userId, user.id), eq(clinicStaff.clinicId, c.assignedClinicId ?? "00000000-0000-0000-0000-000000000000")));
      return s ? { ok: true as const, patientId: c.patientId } : { ok: false as const };
    }
    if (user.role === "care_coordinator" || user.role === "super_admin") return { ok: true as const, patientId: c.patientId };
    const a = await canActForPatient(db, user.id, c.patientId, "records");
    return a.ok ? { ok: true as const, patientId: c.patientId } : { ok: false as const };
  }
  if (target.appointmentId) {
    const [a] = await db.select().from(appointments).where(eq(appointments.id, target.appointmentId));
    if (!a) return { ok: false as const };
    if (user.role === "doctor") {
      const [d] = await db.select({ id: doctors.id }).from(doctors).where(and(eq(doctors.userId, user.id), eq(doctors.id, a.doctorId)));
      return d ? { ok: true as const, patientId: a.patientId } : { ok: false as const };
    }
    const acc = await canActForPatient(db, user.id, a.patientId, "join");
    return acc.ok ? { ok: true as const, patientId: a.patientId } : { ok: false as const };
  }
  if (target.patientId) {
    if (!PATIENT_CATEGORIES.includes(target.category)) return { ok: false as const };
    const acc = await canActForPatient(db, user.id, target.patientId, "records");
    return acc.ok ? { ok: true as const, patientId: target.patientId } : { ok: false as const };
  }
  return { ok: false as const };
}

/** Read a document as this user (row-level security decides) and log the access. */
export async function getDocumentForUser(user: SessionUser, id: string) {
  const doc = await withRls({ userId: user.id, role: user.role }, async (tx) => {
    const [d] = await tx.select().from(documents).where(and(eq(documents.id, id), sql`${documents.deletedAt} is null`));
    return d ?? null;
  });
  if (!doc) return null;
  if (doc.uploadedByUserId !== user.id) {
    await audit({ actor: { id: user.id, role: user.role }, action: "record.view", entityType: "document", entityId: doc.id, patientId: doc.patientId, metadata: { category: doc.category } });
  }
  return doc;
}

export async function listPatientDocuments(user: SessionUser, patientId: string) {
  return withRls({ userId: user.id, role: user.role }, (tx) =>
    tx
      .select()
      .from(documents)
      .where(and(eq(documents.patientId, patientId), sql`${documents.deletedAt} is null`))
      .orderBy(sql`coalesce(${documents.reportDate}::timestamptz, ${documents.createdAt}) desc`),
  );
}

export async function softDeleteDocument(user: SessionUser, id: string) {
  const db = await getDb();
  const [d] = await db.select().from(documents).where(eq(documents.id, id));
  if (!d) return false;
  let allowed = d.uploadedByUserId === user.id;
  if (!allowed && d.patientId) allowed = (await canActForPatient(db, user.id, d.patientId, "records")).ok && !["prescription", "visa_letter", "treatment_plan"].includes(d.category);
  if (!allowed) return false;
  await db.update(documents).set({ deletedAt: new Date() }).where(eq(documents.id, id));
  await audit({ actor: { id: user.id, role: user.role }, action: "record.delete", entityType: "document", entityId: id, patientId: d.patientId });
  return true;
}
