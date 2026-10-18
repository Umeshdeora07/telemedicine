import "server-only";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, patients, payments, refunds } from "@/db/schema";

/** Direct payments a doctor still has to act on: money to confirm, and refunds to send back. */
export async function doctorPaymentQueue(doctorId: string) {
  const db = await getDb();
  const [toConfirm, toRefund] = await Promise.all([
    db
      .select({ p: payments, appt: appointments, patientName: patients.fullName })
      .from(payments)
      .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(and(eq(appointments.doctorId, doctorId), eq(payments.gateway, "direct"), eq(payments.status, "created"), isNotNull(payments.submittedAt)))
      .orderBy(asc(appointments.startAt)),
    db
      .select({ r: refunds, p: payments, appt: appointments, patientName: patients.fullName })
      .from(refunds)
      .innerJoin(payments, eq(payments.id, refunds.paymentId))
      .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
      .innerJoin(patients, eq(patients.id, appointments.patientId))
      .where(and(eq(appointments.doctorId, doctorId), eq(payments.gateway, "direct"), eq(refunds.status, "pending")))
      .orderBy(asc(refunds.createdAt)),
  ]);
  return { toConfirm, toRefund };
}
