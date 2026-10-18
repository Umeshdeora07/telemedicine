import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { getDb, withRls } from "@/db";
import {
  appointments,
  clinics,
  consultActions,
  consultNotes,
  doctors,
  familyLinks,
  notifications,
  patients,
  payments,
  prescriptionItems,
  prescriptions,
  reviews,
  specialties,
} from "@/db/schema";
import type { SessionUser } from "./auth/session";

/** IDs of every patient profile this user can act for (self + consented family). */
export async function myPatientIds(userId: string, need: "book" | "join" | "records" = "join") {
  const db = await getDb();
  const own = await db.select({ id: patients.id }).from(patients).where(and(eq(patients.userId, userId), sql`${patients.deletedAt} is null`));
  const col = need === "book" ? familyLinks.canBook : need === "join" ? familyLinks.canJoin : familyLinks.canViewRecords;
  const linked = await db
    .select({ id: familyLinks.patientId })
    .from(familyLinks)
    .where(and(eq(familyLinks.caregiverUserId, userId), eq(familyLinks.status, "active"), eq(col, true)));
  return [...new Set([...own.map((o) => o.id), ...linked.map((l) => l.id)])];
}

export async function myPeople(userId: string) {
  const db = await getDb();
  const own = await db.select().from(patients).where(and(eq(patients.userId, userId), sql`${patients.deletedAt} is null`));
  const linked = await db
    .select({ p: patients, l: familyLinks })
    .from(familyLinks)
    .innerJoin(patients, eq(patients.id, familyLinks.patientId))
    .where(and(eq(familyLinks.caregiverUserId, userId), sql`${patients.deletedAt} is null`, sql`${familyLinks.status} <> 'revoked'`));
  return [...own.map((p) => ({ patient: p, link: null })), ...linked.map(({ p, l }) => ({ patient: p, link: l }))];
}

const apptSelect = {
  a: appointments,
  doctorName: doctors.fullName,
  doctorSlug: doctors.slug,
  doctorGender: doctors.gender,
  doctorSeed: doctors.avatarSeed,
  doctorPhoto: doctors.photoUrl,
  doctorExp: doctors.experienceYears,
  specialty: specialties.name,
  patientName: patients.fullName,
  clinicName: clinics.name,
  clinicCity: clinics.city,
};

export async function listAppointments(userId: string, filter: "upcoming" | "past" | "cancelled", limit = 50) {
  const ids = await myPatientIds(userId, "join");
  if (!ids.length) return [];
  const db = await getDb();
  const now = new Date();
  const cond =
    filter === "upcoming"
      ? and(inArray(appointments.status, ["confirmed", "checked_in", "in_progress"]), gte(appointments.endAt, new Date(now.getTime() - 60 * 60_000)))
      : filter === "past"
        ? or(eq(appointments.status, "completed"), and(inArray(appointments.status, ["confirmed"]), lt(appointments.endAt, new Date(now.getTime() - 60 * 60_000))))
        : inArray(appointments.status, ["cancelled", "doctor_no_show", "patient_no_show", "expired"]);
  return db
    .select(apptSelect)
    .from(appointments)
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .innerJoin(specialties, eq(specialties.id, doctors.specialtyId))
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .leftJoin(clinics, eq(clinics.id, appointments.clinicId))
    .where(and(inArray(appointments.patientId, ids), cond, filter === "cancelled" ? undefined : sql`${appointments.status} <> 'pending_payment'`))
    .orderBy(filter === "upcoming" ? asc(appointments.startAt) : desc(appointments.startAt))
    .limit(limit);
}

export type ApptRow = Awaited<ReturnType<typeof listAppointments>>[number];

export async function getAppointmentForUser(user: SessionUser, id: string) {
  const ids = await myPatientIds(user.id, "join");
  const db = await getDb();
  const [row] = await db
    .select({ ...apptSelect, doctorTz: doctors.timeZone, followUpDays: doctors.followUpChatDays, doctorId: doctors.id, clinicAddress: clinics.addressLine, clinicLat: clinics.lat, clinicLng: clinics.lng, clinicPhone: clinics.phone, clinicSlug: clinics.slug, patientDob: patients.dob })
    .from(appointments)
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .innerJoin(specialties, eq(specialties.id, doctors.specialtyId))
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .leftJoin(clinics, eq(clinics.id, appointments.clinicId))
    .where(and(eq(appointments.id, id), ids.length ? inArray(appointments.patientId, ids) : sql`false`));
  return row ?? null;
}

/** Notes and prescriptions as this user, through row-level security. */
export async function consultRecords(user: SessionUser, appointmentId: string) {
  return withRls({ userId: user.id, role: user.role }, async (tx) => {
    const [note] = await tx.select().from(consultNotes).where(eq(consultNotes.appointmentId, appointmentId));
    const rx = await tx.select().from(prescriptions).where(eq(prescriptions.appointmentId, appointmentId));
    const items = rx.length ? await tx.select().from(prescriptionItems).where(inArray(prescriptionItems.prescriptionId, rx.map((r) => r.id))).orderBy(asc(prescriptionItems.sortOrder)) : [];
    return { note: note ?? null, prescriptions: rx.map((r) => ({ ...r, items: items.filter((i) => i.prescriptionId === r.id) })) };
  });
}

export async function openActions(userId: string) {
  const ids = await myPatientIds(userId, "book");
  if (!ids.length) return [];
  const db = await getDb();
  return db
    .select({ action: consultActions, patientName: patients.fullName, doctorName: doctors.fullName, doctorSlug: doctors.slug, clinicName: clinics.name, specialtyName: specialties.name, specialtySlug: specialties.slug })
    .from(consultActions)
    .innerJoin(patients, eq(patients.id, consultActions.patientId))
    .innerJoin(doctors, eq(doctors.id, consultActions.doctorId))
    .leftJoin(clinics, eq(clinics.id, consultActions.targetClinicId))
    .leftJoin(specialties, eq(specialties.id, consultActions.targetSpecialtyId))
    .where(and(inArray(consultActions.patientId, ids), eq(consultActions.status, "open")))
    .orderBy(desc(consultActions.createdAt));
}

export async function recentPrescriptions(user: SessionUser, limit = 5) {
  const ids = await myPatientIds(user.id, "records");
  if (!ids.length) return [];
  return withRls({ userId: user.id, role: user.role }, (tx) =>
    tx
      .select({ rx: prescriptions, doctorName: doctors.fullName, patientName: patients.fullName })
      .from(prescriptions)
      .innerJoin(doctors, eq(doctors.id, prescriptions.doctorId))
      .innerJoin(patients, eq(patients.id, prescriptions.patientId))
      .where(inArray(prescriptions.patientId, ids))
      .orderBy(desc(prescriptions.issuedAt))
      .limit(limit),
  );
}

export async function myPayments(userId: string) {
  const db = await getDb();
  return db
    .select({ p: payments, apptRef: appointments.ref, doctorName: doctors.fullName })
    .from(payments)
    .leftJoin(appointments, eq(appointments.id, payments.appointmentId))
    .leftJoin(doctors, eq(doctors.id, appointments.doctorId))
    .where(and(eq(payments.userId, userId), inArray(payments.status, ["captured", "refunded", "partially_refunded"])))
    .orderBy(desc(payments.createdAt));
}

export async function myNotifications(userId: string, limit = 50) {
  const db = await getDb();
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.channel, "in_app"), eq(notifications.status, "sent")))
    .orderBy(desc(notifications.sentAt))
    .limit(limit);
}

export async function reviewFor(appointmentId: string) {
  const db = await getDb();
  const [r] = await db.select().from(reviews).where(eq(reviews.appointmentId, appointmentId));
  return r ?? null;
}
