import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { CalendarPlus, MonitorCheck, QrCode } from "lucide-react";
import { getViewContext } from "@/server/context";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/db";
import { appointments, clinics, documents, doctors, patients } from "@/db/schema";
import { canActForPatient } from "@/server/booking";
import { sameClock } from "@/lib/time";
import { Stepper } from "@/components/ui/stepper";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PreConsultForm } from "@/components/booking/pre-consult-form";
import { ageFrom } from "@/lib/utils";

export const metadata: Metadata = { title: "Consultation booked" };

export default async function DonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const db = await getDb();
  const [row] = await db
    .select({ a: appointments, d: doctors, p: patients })
    .from(appointments)
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(eq(appointments.id, id));
  if (!row || !(await canActForPatient(db, user.id, row.a.patientId, "join")).ok) notFound();
  const { a, d, p } = row;
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  if (a.status === "pending_payment") {
    return (
      <Alert tone="info" title={t("Waiting for payment confirmation")}>
        {t("This can take a minute.")}{" "}
        <Link href={`/book/review/${a.id}`} className="font-semibold text-primary underline">
          {t("Back to payment")}
        </Link>
      </Alert>
    );
  }
  const [clinic] = a.clinicId ? await db.select().from(clinics).where(eq(clinics.id, a.clinicId)) : [];
  const uploaded = await db.select().from(documents).where(and(eq(documents.appointmentId, a.id), isNull(documents.deletedAt)));
  const isClinic = a.mode === "in_clinic";
  const nextHref = isClinic ? `/consults/${a.id}/pass` : `/consults/${a.id}`;

  return (
    <div className="space-y-6">
      <Stepper current={4} total={4} label={t("Step {current} of {total}: tell the doctor", { current: 4, total: 4 })} />
      <section className="card flex flex-col items-center gap-3 p-6 text-center" aria-live="polite">
        <svg viewBox="0 0 52 52" className="animate-pop size-20" aria-hidden>
          <circle cx="26" cy="26" r="25" fill="var(--success)" />
          <path d="M14 27l8 8 16-17" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" className="animate-tick" />
        </svg>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{isClinic ? t("Your clinic visit is booked") : t("Your consultation is booked")}</h1>
        <p className="text-lg">
          {t("With {doctor} on {date}", { doctor: d.fullName, date: fmt.dateTime(a.startAt) })}{" "}
          <span className="text-fg-muted">({t("your local time, {zone}", { zone: fmt.zone(ctx.tz, a.startAt) })})</span>
        </p>
        {!sameClock(a.patientTimeZone, ctx.tz, a.startAt) ? (
          <p className="text-fg-muted">{t("For {name}, this is {time}.", { name: p.fullName, time: fmt.dateTime(a.startAt, a.patientTimeZone) })}</p>
        ) : null}
        {clinic ? <p className="text-fg-muted">{`${clinic.name}, ${clinic.addressLine}, ${clinic.city}`}</p> : null}
        <p className="text-sm text-fg-muted">{t("Your booking reference is {ref}. We have sent you the details.", { ref: a.ref })}</p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <a href={`/api/appointments/${a.id}/ics`} className="tap inline-flex items-center gap-2 rounded-xl border border-field px-4 font-semibold hover:bg-surface-2">
            <CalendarPlus className="size-5" aria-hidden />
            {t("Add to calendar")}
          </a>
          {isClinic ? (
            <ButtonLink href={`/consults/${a.id}/pass`} variant="secondary">
              <QrCode className="size-5" aria-hidden />
              {t("Visit pass")}
            </ButtonLink>
          ) : (
            <ButtonLink href={`/consult/${a.id}/check`} variant="secondary">
              <MonitorCheck className="size-5" aria-hidden />
              {t("Test your camera and microphone")}
            </ButtonLink>
          )}
        </div>
      </section>

      {a.preConsult ? (
        <Alert tone="success" title={t("Your details are with the doctor")}>
          <Link href={nextHref} className="font-semibold text-primary underline">
            {t("View booking")}
          </Link>
        </Alert>
      ) : (
        <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="prep">
          <div>
            <h2 id="prep" className="text-xl font-bold">
              {t("Health form before your consultation")}
            </h2>
            <p className="text-fg-muted">
              {t("Tell {doctor} about the problem so the consultation can start straight away. It takes about 2 minutes. You can also fill it in later from My consultations.", { doctor: d.fullName })}
            </p>
          </div>
          <PreConsultForm
            apptId={a.id}
            patientName={p.fullName}
            doctorName={d.fullName}
            isMinor={(ageFrom(p.dob) ?? 99) < 18}
            nextHref={nextHref}
            uploaded={uploaded.map((u) => ({ id: u.id, title: u.title, mimeType: u.mimeType, sizeBytes: u.sizeBytes }))}
            defaults={{
              mainProblem: a.chiefComplaint ?? "",
              since: "",
              currentMedicines: p.currentMedicines.join(", "),
              allergies: p.allergies.join(", ") || "",
              pastConditions: p.conditions.join(", "),
              questions: "",
              shareHistory: false,
            }}
          />
          <p className="text-center">
            <Link href={nextHref} className="tap inline-flex items-center font-semibold text-primary">
              {t("Fill it in later")}
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
