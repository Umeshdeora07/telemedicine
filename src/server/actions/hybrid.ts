"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, consultActions } from "@/db/schema";
import { getT } from "@/i18n/server";
import { getViewerRegion } from "@/lib/prefs";
import { requireUser } from "@/server/auth/session";
import { BookingError, canActForPatient, confirmAppointment, createDraftAppointment } from "@/server/booking";
import { audit } from "@/server/audit";

/** Book the clinic visit the doctor recommended, linked to the online consult. */
export async function bookClinicVisitAction(parentId: string, slotId: string, doctorId: string) {
  const t = await getT();
  const user = await requireUser();
  const db = await getDb();
  const [parent] = await db.select().from(appointments).where(eq(appointments.id, parentId));
  if (!parent || !(await canActForPatient(db, user.id, parent.patientId, "book")).ok) return { error: t("Not allowed.") };
  const [action] = await db.select().from(consultActions).where(and(eq(consultActions.appointmentId, parent.id), eq(consultActions.type, "in_person_visit")));
  const { currency } = await getViewerRegion(user);
  let id: string;
  try {
    const appt = await createDraftAppointment({
      userId: user.id,
      doctorId,
      mode: "in_clinic",
      slotId,
      patientId: parent.patientId,
      currency,
      patientTimeZone: "Asia/Kolkata",
      consultType: "follow_up",
      redFlags: [],
      parentAppointmentId: parent.id,
      actionId: action?.id ?? null,
      caregiverConfirmedConsent: true,
    });
    id = appt.id;
  } catch (e) {
    if (e instanceof BookingError) return { error: t(e.message) };
    throw e;
  }
  redirect(`/book/review/${id}`);
}

/** In-clinic visits can be paid at the reception desk instead of online. */
export async function payAtClinicAction(apptId: string): Promise<void> {
  const user = await requireUser();
  const db = await getDb();
  const [a] = await db.select().from(appointments).where(and(eq(appointments.id, apptId), eq(appointments.bookedByUserId, user.id)));
  if (!a || a.mode !== "in_clinic" || a.status !== "pending_payment") redirect(`/book/review/${apptId}`);
  await db.update(appointments).set({ paymentMode: "at_clinic" }).where(eq(appointments.id, a.id));
  await confirmAppointment(db, a.id);
  await audit({ actor: { id: user.id, role: user.role }, action: "appointment.pay_at_clinic", entityType: "appointment", entityId: a.id, patientId: a.patientId });
  redirect(`/book/done/${a.id}`);
}
