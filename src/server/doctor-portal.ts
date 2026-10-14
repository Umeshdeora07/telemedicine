import "server-only";
import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, doctorLicences, doctors, messages, patients, payments, payouts, reviews, roomParticipants, secondOpinions } from "@/db/schema";
import { env } from "@/config/env";
import { dayBoundsUtc, dayInZone } from "@/lib/time";

export type DoctorRow = typeof doctors.$inferSelect;

export async function doctorQueue(d: DoctorRow, day = dayInZone(new Date(), d.timeZone)) {
  const db = await getDb();
  const { start, end } = dayBoundsUtc(day, d.timeZone);
  const rows = await db
    .select({ a: appointments, patientName: patients.fullName, patientDob: patients.dob, patientSex: patients.sex })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(
      and(
        eq(appointments.doctorId, d.id),
        inArray(appointments.status, ["confirmed", "checked_in", "in_progress", "completed", "doctor_no_show"]),
        sql`((${appointments.startAt} >= ${start.toISOString()}::timestamptz and ${appointments.startAt} < ${end.toISOString()}::timestamptz) or (${appointments.kind} = 'instant' and ${appointments.status} in ('confirmed','in_progress')))`,
      ),
    )
    .orderBy(asc(appointments.startAt));
  const ids = rows.map((r) => r.a.id);
  const present = ids.length
    ? await db
        .select({ apptId: roomParticipants.appointmentId, role: roomParticipants.role })
        .from(roomParticipants)
        .where(and(inArray(roomParticipants.appointmentId, ids), isNull(roomParticipants.leftAt), gt(roomParticipants.lastSeenAt, new Date(Date.now() - 30_000))))
    : [];
  return rows.map((r) => ({ ...r, waiting: present.some((p) => p.apptId === r.a.id && p.role !== "doctor") }));
}

export async function doctorUpcoming(d: DoctorRow, days = 7) {
  const db = await getDb();
  return db
    .select({ a: appointments, patientName: patients.fullName })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(and(eq(appointments.doctorId, d.id), eq(appointments.status, "confirmed"), gt(appointments.startAt, new Date()), lt(appointments.startAt, new Date(Date.now() + days * 86400_000))))
    .orderBy(asc(appointments.startAt))
    .limit(100);
}

export async function doctorEarnings(d: DoctorRow) {
  const db = await getDb();
  const rows = await db
    .select({ p: payments, a: appointments })
    .from(payments)
    .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
    .where(and(eq(appointments.doctorId, d.id), inArray(payments.status, ["captured", "partially_refunded", "refunded"])))
    .orderBy(desc(payments.createdAt));
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  // Doctor's share is computed on the consultation fee in INR (platform fee and GST excluded).
  const inInr = (p: typeof payments.$inferSelect) => (p.currency === "INR" ? p.feeMinor : Math.round(p.feeMinor / (p.fxRate || 1)));
  const sum = (filter: (r: (typeof rows)[number]) => boolean) => rows.filter(filter).reduce((s, r) => s + inInr(r.p), 0);
  const released = sum((r) => (r.p.payoutState === "released" || r.p.payoutState === "paid_out") && r.p.createdAt >= monthStart);
  const held = sum((r) => r.p.payoutState === "held");
  const refunded = sum((r) => r.p.payoutState === "refunded");
  const commission = Math.round(released * env.commissionRate);
  const tds = Math.round((released - commission) * 0.1);
  const paid = await db.select().from(payouts).where(eq(payouts.doctorId, d.id)).orderBy(desc(payouts.periodEnd));
  return { released, held, refunded, commission, tds, net: released - commission - tds, consults: rows.filter((r) => r.a.status === "completed" && r.p.createdAt >= monthStart).length, rows: rows.slice(0, 30), payouts: paid, commissionRate: env.commissionRate };
}

export async function doctorLicenceAlerts(d: DoctorRow) {
  const db = await getDb();
  const lic = await db.select().from(doctorLicences).where(eq(doctorLicences.doctorId, d.id)).orderBy(asc(doctorLicences.expiresAt));
  const today = new Date();
  return lic.map((l) => ({ ...l, daysLeft: l.expiresAt ? Math.ceil((new Date(l.expiresAt).getTime() - today.getTime()) / 86400_000) : null }));
}

export async function doctorReviews(d: DoctorRow) {
  const db = await getDb();
  return db.select().from(reviews).where(eq(reviews.doctorId, d.id)).orderBy(desc(reviews.createdAt)).limit(100);
}

export async function doctorSecondOpinions(d: DoctorRow) {
  const db = await getDb();
  return db
    .select({ s: secondOpinions, patientName: patients.fullName })
    .from(secondOpinions)
    .innerJoin(patients, eq(patients.id, secondOpinions.patientId))
    .where(eq(secondOpinions.doctorId, d.id))
    .orderBy(asc(secondOpinions.dueAt));
}

/** Follow-up chats still open where the patient side wrote last. */
export async function doctorOpenChats(d: DoctorRow) {
  const db = await getDb();
  const open = await db
    .select({ a: appointments, patientName: patients.fullName })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(and(eq(appointments.doctorId, d.id), eq(appointments.status, "completed"), gte(appointments.followUpChatUntil, new Date())))
    .orderBy(desc(appointments.endedAt));
  const out = [];
  for (const o of open) {
    const [last] = await db.select().from(messages).where(eq(messages.appointmentId, o.a.id)).orderBy(desc(messages.id)).limit(1);
    out.push({ ...o, last: last ?? null, needsReply: Boolean(last && last.senderRole !== "doctor" && last.kind !== "system") });
  }
  return out;
}
