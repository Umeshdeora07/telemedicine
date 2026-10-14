import "server-only";
import { UserError } from "@/lib/errors";
import { and, asc, desc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, withRls } from "@/db";
import { appointments, availabilitySlots, clinicStaff, clinics, consultNotes, doctorClinicLinks, doctors, payments, patients, specialties, users } from "@/db/schema";
import type { SessionUser } from "@/server/auth/session";
import { parseVisitPassToken } from "@/lib/visit-pass";
import { dayBoundsUtc, dayInZone } from "@/lib/time";
import { audit } from "@/server/audit";
import { notifyUser } from "@/server/notify";
import { nextInvoiceNumber } from "@/server/booking";

export type ClinicRow = typeof clinics.$inferSelect;

export async function clinicsForUser(user: SessionUser) {
  const db = await getDb();
  return db.select({ c: clinics, title: clinicStaff.title }).from(clinicStaff).innerJoin(clinics, eq(clinics.id, clinicStaff.clinicId)).where(eq(clinicStaff.userId, user.id)).orderBy(asc(clinics.name));
}

/** The clinic a coordinator is working on (first one, or the one chosen with ?clinic=). */
export async function currentClinic(user: SessionUser, wanted?: string | null) {
  const list = await clinicsForUser(user);
  return (list.find((x) => x.c.id === wanted) ?? list[0])?.c ?? null;
}

export async function clinicVisits(clinic: ClinicRow, day = dayInZone(new Date(), clinic.timeZone)) {
  const db = await getDb();
  const { start, end } = dayBoundsUtc(day, clinic.timeZone);
  const parent = alias(appointments, "parent");
  return db
    .select({ a: appointments, patientName: patients.fullName, patientPhone: users.phone, doctorName: doctors.fullName, doctorSlug: doctors.slug, hasParent: isNotNull(parent.id) })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .leftJoin(users, eq(users.id, appointments.bookedByUserId))
    .leftJoin(parent, eq(parent.id, appointments.parentAppointmentId))
    .where(
      and(
        eq(appointments.clinicId, clinic.id),
        eq(appointments.mode, "in_clinic"),
        inArray(appointments.status, ["confirmed", "checked_in", "in_progress", "completed", "patient_no_show", "doctor_no_show"]),
        gte(appointments.startAt, start),
        lt(appointments.startAt, end),
      ),
    )
    .orderBy(asc(appointments.startAt));
}

/** Everything reception needs for one visit, including the online consult that led to it (shared with the clinic). */
export async function clinicVisit(user: SessionUser, clinic: ClinicRow, apptId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ a: appointments, p: patients, doctorName: doctors.fullName, bookedByName: users.name, bookedByPhone: users.phone })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .leftJoin(users, eq(users.id, appointments.bookedByUserId))
    .where(and(eq(appointments.id, apptId), eq(appointments.clinicId, clinic.id)));
  if (!row) return null;
  let parent: { a: typeof appointments.$inferSelect; doctorName: string; note: typeof consultNotes.$inferSelect | null } | null = null;
  if (row.a.parentAppointmentId) {
    const [pa] = await db.select({ a: appointments, doctorName: doctors.fullName }).from(appointments).innerJoin(doctors, eq(doctors.id, appointments.doctorId)).where(eq(appointments.id, row.a.parentAppointmentId));
    // Notes are read under row-level security: the clinic only sees notes of consults that led to a visit here.
    const [note] = pa ? await withRls({ userId: user.id, role: user.role }, (tx) => tx.select().from(consultNotes).where(eq(consultNotes.appointmentId, pa.a.id))) : [];
    if (pa) parent = { ...pa, note: note ?? null };
  }
  const pays = await db.select().from(payments).where(eq(payments.appointmentId, row.a.id)).orderBy(desc(payments.createdAt));
  await audit({ actor: { id: user.id, role: user.role }, action: "record.view", entityType: "appointment", entityId: row.a.id, patientId: row.a.patientId, metadata: { context: "clinic_desk" } });
  return { ...row, parent, payments: pays };
}

export class CheckInError extends UserError {}

/** Check a patient in by scanning the visit-pass QR, or typing the 6-character code. */
export async function checkIn(user: SessionUser, clinicIds: string[], input: { token?: string; code?: string }) {
  const db = await getDb();
  let row: typeof appointments.$inferSelect | undefined;
  if (input.token) {
    const raw = input.token.includes("pass=") ? decodeURIComponent(new URL(input.token, "http://x").searchParams.get("pass") ?? "") : input.token;
    const id = parseVisitPassToken(raw);
    if (!id) throw new CheckInError("This QR code isn't a valid visit pass.");
    [row] = await db.select().from(appointments).where(eq(appointments.id, id));
  } else if (input.code) {
    const code = input.code.trim().toUpperCase().replace(/\s+/g, "");
    [row] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.visitPassCode, code), inArray(appointments.clinicId, clinicIds.length ? clinicIds : ["00000000-0000-0000-0000-000000000000"]), inArray(appointments.status, ["confirmed", "checked_in"])))
      .orderBy(desc(appointments.startAt))
      .limit(1);
  }
  if (!row || !row.clinicId || !clinicIds.includes(row.clinicId)) throw new CheckInError("No visit found for this pass at your clinic.");
  if (row.status === "checked_in") return { appt: row, already: true };
  if (row.status !== "confirmed") throw new CheckInError("This visit is not active (it may be cancelled or already completed).");
  const hoursAway = (row.startAt.getTime() - Date.now()) / 3600_000;
  if (hoursAway > 12) throw new CheckInError("This pass is for a later date. Please check the date with the patient.");
  const [updated] = await db.update(appointments).set({ status: "checked_in", checkedInAt: new Date(), checkedInBy: user.id }).where(eq(appointments.id, row.id)).returning();
  await audit({ actor: { id: user.id, role: user.role }, action: "appointment.check_in", entityType: "appointment", entityId: row.id, patientId: row.patientId });
  const [doc] = await db.select({ userId: doctors.userId }).from(doctors).where(eq(doctors.id, row.doctorId));
  const [p] = await db.select({ name: patients.fullName }).from(patients).where(eq(patients.id, row.patientId));
  if (doc?.userId) await notifyUser(db, doc.userId, { template: "patient_checked_in", title: `${p?.name ?? "Patient"} has checked in`, body: `Visit ${row.ref}`, link: `/doctor/visits/${row.id}`, appointmentId: row.id, channels: ["in_app", "push"] });
  return { appt: updated!, already: false };
}

/** Record a payment taken at the reception desk for a pay-at-clinic visit, and issue the invoice. */
export async function recordDeskPayment(user: SessionUser, clinicIds: string[], apptId: string, method: "cash" | "upi" | "card") {
  const db = await getDb();
  const [a] = await db.select().from(appointments).where(eq(appointments.id, apptId));
  if (!a || !a.clinicId || !clinicIds.includes(a.clinicId)) throw new CheckInError("Not allowed.");
  if (a.paymentMode !== "at_clinic") throw new CheckInError("This visit was already paid online.");
  const existing = await db.select().from(payments).where(and(eq(payments.appointmentId, a.id), eq(payments.status, "captured")));
  if (existing.length) return existing[0]!;
  const [u] = await db.select().from(users).where(eq(users.id, a.bookedByUserId));
  const invoiceNumber = await nextInvoiceNumber(db);
  const [pay] = await db
    .insert(payments)
    .values({
      userId: a.bookedByUserId,
      patientId: a.patientId,
      appointmentId: a.id,
      purpose: "clinic_visit",
      gateway: "clinic_desk",
      gatewayPaymentId: `DESK-${Date.now().toString(36).toUpperCase()}`,
      method,
      currency: a.currency,
      amountMinor: a.totalMinor,
      feeMinor: a.feeMinor,
      platformFeeMinor: a.platformFeeMinor,
      taxMinor: a.taxMinor,
      discountMinor: a.discountMinor + a.creditMinor,
      status: "captured",
      capturedAt: new Date(),
      payoutState: "released",
      invoiceNumber,
      invoiceIssuedAt: new Date(),
      billing: { name: u?.name ?? "", phone: u?.phone ?? undefined, country: "IN" },
    })
    .returning();
  await audit({ actor: { id: user.id, role: user.role }, action: "payment.desk", entityType: "payment", entityId: pay!.id, patientId: a.patientId, metadata: { method } });
  return pay!;
}

export async function clinicRoster(clinic: ClinicRow) {
  const db = await getDb();
  const now = new Date();
  const week = new Date(Date.now() + 7 * 86400_000);
  const docs = await db
    .select({ d: doctors, specialty: specialties.name, role: doctorClinicLinks.role, inClinicFeeMinor: doctorClinicLinks.inClinicFeeMinor })
    .from(doctorClinicLinks)
    .innerJoin(doctors, eq(doctors.id, doctorClinicLinks.doctorId))
    .innerJoin(specialties, eq(specialties.id, doctors.specialtyId))
    .where(and(eq(doctorClinicLinks.clinicId, clinic.id), eq(doctorClinicLinks.active, true)))
    .orderBy(asc(doctors.fullName));
  const ids = docs.map((x) => x.d.id);
  const counts = ids.length
    ? await db
        .select({ doctorId: availabilitySlots.doctorId, open: sql<number>`count(*) filter (where ${availabilitySlots.status} = 'open')`.mapWith(Number), booked: sql<number>`count(*) filter (where ${availabilitySlots.status} = 'booked')`.mapWith(Number) })
        .from(availabilitySlots)
        .where(and(inArray(availabilitySlots.doctorId, ids), eq(availabilitySlots.clinicId, clinic.id), gte(availabilitySlots.startAt, now), lt(availabilitySlots.startAt, week)))
        .groupBy(availabilitySlots.doctorId)
    : [];
  return docs.map((x) => ({ ...x, open: counts.find((c) => c.doctorId === x.d.id)?.open ?? 0, booked: counts.find((c) => c.doctorId === x.d.id)?.booked ?? 0 }));
}

export async function clinicPayments(clinic: ClinicRow, limit = 100) {
  const db = await getDb();
  return db
    .select({ p: payments, a: appointments, patientName: patients.fullName, doctorName: doctors.fullName })
    .from(payments)
    .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .where(and(eq(appointments.clinicId, clinic.id), inArray(payments.status, ["captured", "partially_refunded", "refunded"])))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
}
