import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Building2, FileText, Wallet } from "lucide-react";
import { getViewContext } from "@/server/context";
import { getAppointmentForUser } from "@/server/patient";
import { getOpenSlots, isDoctorVisible } from "@/server/doctors";
import { getDb } from "@/db";
import { clinics, consultActions, doctorClinicLinks, doctors, payments } from "@/db/schema";
import { Stepper } from "@/components/ui/stepper";
import { Alert } from "@/components/ui/alert";
import { ClinicVisitPicker } from "@/components/booking/clinic-visit-picker";
import { dayInZone } from "@/lib/time";

export const metadata: Metadata = { title: "Book clinic visit" };

/** Online consultation to clinic visit in one tap: same doctor (or their hospital), notes and payment carry over. */
export default async function ClinicVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const row = await getAppointmentForUser(ctx.user!, id);
  if (!row) notFound();
  const db = await getDb();
  const [action] = await db.select().from(consultActions).where(and(eq(consultActions.appointmentId, id), eq(consultActions.type, "in_person_visit")));
  const [doc] = await db.select().from(doctors).where(eq(doctors.id, row.doctorId));
  // Same doctor's clinic slots first; otherwise other doctors in the same specialty at the recommended hospital.
  const clinicId = action?.targetClinicId ?? doc?.primaryClinicId ?? null;
  const candidates = [doc!];
  if (clinicId) {
    const others = await db
      .select({ d: doctors })
      .from(doctorClinicLinks)
      .innerJoin(doctors, eq(doctors.id, doctorClinicLinks.doctorId))
      .where(and(eq(doctorClinicLinks.clinicId, clinicId), eq(doctorClinicLinks.active, true), eq(doctors.specialtyId, doc!.specialtyId)));
    for (const o of others) if (o.d.id !== doc!.id) candidates.push(o.d);
  }
  const options = [];
  for (const d of candidates) {
    if (!d.modes.includes("in_clinic") || !(await isDoctorVisible(db, d.id, { country: "IN", region: null }))) continue;
    const slots = await getOpenSlots(db, d.id, "in_clinic", { days: 14, clinicId });
    const [c] = d.primaryClinicId ? await db.select().from(clinics).where(eq(clinics.id, clinicId ?? d.primaryClinicId)) : [];
    options.push({
      doctorId: d.id,
      doctorName: d.fullName,
      clinicName: c ? `${c.name}, ${c.city}` : "",
      slots: slots.slice(0, 40).map((s) => ({ id: s.id, label: fmt.time(s.startAt, "Asia/Kolkata"), day: fmt.date(s.startAt, "Asia/Kolkata", { weekday: "short", day: "numeric", month: "short", year: undefined }) })),
    });
  }
  const [paid] = await db.select().from(payments).where(and(eq(payments.appointmentId, id), eq(payments.status, "captured")));
  void dayInZone;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Stepper current={1} total={4} label={t("Step {current} of {total}: choose a clinic time", { current: 1, total: 4 })} />
      <div>
        <h1 className="text-2xl font-extrabold">{t("Book your clinic visit")}</h1>
        <p className="text-fg-muted">{t("For {name}, as recommended by {doctor}.", { name: row.patientName, doctor: row.doctorName })}</p>
      </div>
      {action ? <Alert tone="info" title={t("Why")}>{(action.details as { reason?: string }).reason}</Alert> : null}
      <ul className="space-y-2 text-[0.9375rem]">
        <li className="flex gap-2"><FileText className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />{t("Your online consultation notes and reports are shared with the clinic, so you do not have to repeat everything.")}</li>
        {paid && doc?.creditOnlineFeeToClinic ? <li className="flex gap-2"><Wallet className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />{t("The online consultation fee ({fee}) is taken off the clinic visit with the same doctor.", { fee: fmt.money(paid.feeMinor, paid.currency) })}</li> : null}
        <li className="flex gap-2"><Building2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />{t("You will get a visit pass with a QR code to show at reception. Times are shown in India time (IST).")}</li>
      </ul>
      <div className="card p-5">
        <ClinicVisitPicker parentId={id} options={options} />
      </div>
    </div>
  );
}
