import "server-only";
import { and, asc, desc, eq, gt, ilike, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, callbackRequests, doctors, interpreters, patients, users } from "@/db/schema";
import type { SessionUser } from "@/server/auth/session";
import { createDraftAppointment } from "@/server/booking";
import { createInvite } from "@/server/room";
import { notifyUser } from "@/server/notify";
import { audit } from "@/server/audit";
import type { Currency } from "@/config/currencies";

export async function callbackQueue() {
  const db = await getDb();
  const rows = await db.select().from(callbackRequests).orderBy(asc(callbackRequests.status), desc(callbackRequests.createdAt)).limit(200);
  const ids = [...new Set(rows.map((r) => r.assignedToUserId).filter(Boolean) as string[])];
  const names = ids.length ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ids)) : [];
  return rows.map((r) => ({ ...r, assignee: names.find((n) => n.id === r.assignedToUserId)?.name ?? null }));
}

export async function updateCallback(user: SessionUser, id: string, patch: { status: "open" | "in_progress" | "done"; outcome?: string; assignToMe?: boolean }) {
  const db = await getDb();
  const [r] = await db
    .update(callbackRequests)
    .set({ status: patch.status, outcome: patch.outcome?.slice(0, 1000) || undefined, assignedToUserId: patch.assignToMe ? user.id : undefined, updatedAt: new Date() })
    .where(eq(callbackRequests.id, id))
    .returning();
  if (r) await audit({ actor: { id: user.id, role: user.role }, action: "callback.update", entityType: "callback", entityId: id, metadata: { status: patch.status } });
  return r;
}

/** Find a patient by phone, email or name (for assisted bookings over the phone). */
export async function findPatients(q: string) {
  const query = q.trim();
  if (query.length < 3) return [];
  const db = await getDb();
  const digits = query.replace(/[^\d]/g, "");
  return db
    .select(patientOwnerFields)
    .from(patients)
    .innerJoin(users, eq(users.id, patients.ownerUserId))
    .where(and(isNull(patients.deletedAt), or(ilike(patients.fullName, `%${query}%`), digits.length >= 4 ? ilike(users.phone, `%${digits}%`) : undefined, ilike(users.email, `%${query}%`))))
    .limit(20);
}

const patientOwnerFields = { p: patients, ownerId: users.id, ownerName: users.name, ownerPhone: users.phone, ownerEmail: users.email, country: users.countryCode, currency: users.currency, timeZone: users.timeZone };

export async function patientWithOwner(patientId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(patientId)) return null;
  const db = await getDb();
  const [row] = await db.select(patientOwnerFields).from(patients).innerJoin(users, eq(users.id, patients.ownerUserId)).where(and(eq(patients.id, patientId), isNull(patients.deletedAt)));
  return row ?? null;
}

/**
 * Book on the patient's behalf during a call. The booking belongs to the
 * patient's own account, so they get the payment link and all reminders;
 * the audit log records which coordinator made it.
 */
export async function assistedBooking(user: SessionUser, input: { patientId: string; doctorId: string; mode: "video" | "audio" | "chat" | "in_clinic"; slotId: string; country: string; region: string | null; interpreterLanguage: string | null; patientAgreed: boolean }) {
  const db = await getDb();
  const [row] = await db.select({ p: patients, owner: users }).from(patients).innerJoin(users, eq(users.id, patients.ownerUserId)).where(eq(patients.id, input.patientId));
  if (!row) throw new Error("Patient not found");
  if (!input.patientAgreed) throw new Error("Confirm the patient asked for this booking.");
  const appt = await createDraftAppointment({
    userId: row.owner.id,
    doctorId: input.doctorId,
    mode: input.mode,
    slotId: input.slotId,
    patientId: row.p.id,
    location: { country: input.country, region: input.region },
    currency: row.owner.currency as Currency,
    patientTimeZone: row.owner.timeZone,
    interpreterLanguage: input.interpreterLanguage,
    redFlags: [],
    bookedByRole: "care_coordinator",
  });
  await notifyUser(db, row.owner.id, {
    template: "assisted_booking",
    title: "Complete your booking",
    body: `Our care team reserved a consult for ${row.p.fullName}. Pay within 15 minutes to confirm it.`,
    link: `/book/review/${appt.id}`,
    appointmentId: appt.id,
  });
  await audit({ actor: { id: user.id, role: user.role }, action: "appointment.assisted_booking", entityType: "appointment", entityId: appt.id, patientId: row.p.id });
  return appt;
}

/** Upcoming consults where the patient asked for an interpreter. */
export async function interpreterQueue() {
  const db = await getDb();
  return db
    .select({ a: appointments, patientName: patients.fullName, doctorName: doctors.fullName, interpreterName: interpreters.name })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .leftJoin(interpreters, eq(interpreters.id, appointments.interpreterId))
    .where(and(isNotNull(appointments.interpreterLanguage), inArray(appointments.status, ["confirmed", "checked_in", "in_progress"]), gt(appointments.endAt, new Date())))
    .orderBy(asc(appointments.startAt));
}

export async function listInterpreters() {
  const db = await getDb();
  return db.select().from(interpreters).where(eq(interpreters.active, true)).orderBy(asc(interpreters.name));
}

export async function assignInterpreter(user: SessionUser, apptId: string, interpreterId: string) {
  const db = await getDb();
  const [i] = await db.select().from(interpreters).where(eq(interpreters.id, interpreterId));
  const [a] = await db.select().from(appointments).where(eq(appointments.id, apptId));
  if (!i || !a) throw new Error("Not found");
  await db.update(appointments).set({ interpreterId: i.id }).where(eq(appointments.id, a.id));
  const url = await createInvite(a.id, user.id, "interpreter", i.name, i.phone ?? i.email);
  await notifyUser(db, a.bookedByUserId, { template: "interpreter_assigned", title: "Interpreter arranged", body: `${i.name} will join your consult to help with ${a.interpreterLanguage}.`, link: `/consults/${a.id}`, appointmentId: a.id });
  await audit({ actor: { id: user.id, role: user.role }, action: "appointment.interpreter", entityType: "appointment", entityId: a.id, patientId: a.patientId, metadata: { interpreterId } });
  return { url, interpreter: i };
}
