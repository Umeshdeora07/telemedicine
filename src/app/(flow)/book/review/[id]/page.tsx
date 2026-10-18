import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { BellRing, Globe2, RotateCcw, ShieldCheck, Stethoscope, Undo2 } from "lucide-react";
import { getViewContext } from "@/server/context";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/db";
import { appointments, availabilitySlots, clinics, coupons, doctors, patients, specialties } from "@/db/schema";
import { quoteForAppointment } from "@/server/booking";
import { METHODS_BY_CURRENCY, pickGateway } from "@/server/payments/gateways";
import { Stepper } from "@/components/ui/stepper";
import { Alert } from "@/components/ui/alert";
import { DoctorAvatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { PayPanel } from "@/components/booking/pay-panel";
import { acceptsDirectPayment } from "@/lib/direct-payment";
import { payAtClinicAction } from "@/server/actions/hybrid";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = { title: "Review and pay" };

export default async function ReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cancelled?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const db = await getDb();
  const [row] = await db
    .select({ a: appointments, d: doctors, p: patients, s: specialties })
    .from(appointments)
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .innerJoin(specialties, eq(specialties.id, doctors.specialtyId))
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(and(eq(appointments.id, id), eq(appointments.bookedByUserId, user.id)));
  if (!row) notFound();
  const { a, d, p } = row;
  if (a.status === "confirmed") redirect(`/book/done/${a.id}`);
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  if (a.status !== "pending_payment") {
    return (
      <Alert tone="warning" title={t("This booking has expired")}>
        {t("We can hold a time for 15 minutes only.")}{" "}
        <Link className="font-semibold text-primary underline" href={`/book/${d.slug}${a.mode === "in_clinic" ? "" : `?mode=${a.mode}`}`}>
          {t("Choose a new time")}
        </Link>
      </Alert>
    );
  }
  const [coupon] = a.couponId ? await db.select().from(coupons).where(eq(coupons.id, a.couponId)) : [];
  const q = await quoteForAppointment(a, coupon ?? null);
  const [slot] = a.slotId ? await db.select().from(availabilitySlots).where(eq(availabilitySlots.id, a.slotId)) : [];
  const [clinic] = a.clinicId ? await db.select().from(clinics).where(eq(clinics.id, a.clinicId)) : [];
  const money = (m: number) => fmt.money(m, a.currency);
  const isClinic = a.mode === "in_clinic";
  const modeLabel = { video: t("Video consultation"), audio: t("Audio call"), chat: t("Chat consultation"), in_clinic: t("Clinic visit") }[a.mode];
  const direct = acceptsDirectPayment(d.paymentDetails);
  const gateway = direct ? "direct" : pickGateway(a.currency);
  const covered = a.paymentMode === "plan";

  return (
    <div className="space-y-6">
      <Stepper current={3} total={4} label={t("Step {current} of {total}: review and pay", { current: 3, total: 4 })} />
      <h1 className="text-2xl font-extrabold sm:text-3xl">{t("Review and pay")}</h1>
      {sp.cancelled ? <Alert tone="warning">{t("The payment was cancelled. No money was taken.")}</Alert> : null}

      <section className="card space-y-4 p-5" aria-labelledby="summary">
        <h2 id="summary" className="sr-only">
          {t("Booking summary")}
        </h2>
        <div className="flex items-center gap-3">
          <DoctorAvatar name={d.fullName} photoUrl={d.photoUrl} size={56} />
          <div className="min-w-0">
            <p className="font-bold text-heading">{d.fullName}</p>
            <p className="text-fg-muted">{t(row.s.name)}</p>
            <VerifiedBadge label={t("Registration verified")} className="mt-1" />
          </div>
        </div>
        <dl className="grid gap-3 text-[0.9375rem] sm:grid-cols-2">
          <div>
            <dt className="text-fg-muted">{t("Patient")}</dt>
            <dd className="font-semibold">{p.fullName}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">{t("Consultation")}</dt>
            <dd className="font-semibold">
              {[modeLabel, t("{n} minutes", { n: a.policySnapshot?.consultMinutes ?? d.consultMinutes }), a.consultType === "follow_up" ? t("Follow up") : ""].filter(Boolean).join(", ")}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">{t("Date and time")}</dt>
            <dd className="font-semibold">
              {fmt.dateTime(a.startAt)} <span className="font-normal text-fg-muted">({t("your local time, {zone}", { zone: fmt.zone(ctx.tz, a.startAt) })})</span>
            </dd>
          </div>
          {clinic ? (
            <div>
              <dt className="text-fg-muted">{t("Clinic")}</dt>
              <dd className="font-semibold">{`${clinic.name}, ${clinic.city}`}</dd>
            </div>
          ) : null}
        </dl>
        {!isClinic ? (
          <p className="flex items-start gap-2 rounded-xl bg-primary-soft p-3 text-[0.9375rem] text-primary-soft-fg">
            <Globe2 className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              {t(
                "Your doctor is registered in India. If you live outside India, a prescription from an Indian doctor may not be accepted by pharmacies in your country. Your doctor will give you a written treatment plan that you can share with your local doctor.",
              )}
            </span>
          </p>
        ) : null}
        {!isClinic ? (
          <p className="text-sm">
            <Link href={`/book/${d.slug}?mode=${a.mode}`} className="tap inline-flex items-center font-semibold text-primary underline">
              {t("Change the time or type of consultation")}
            </Link>
          </p>
        ) : null}
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="price">
        <h2 id="price" className="text-lg font-bold">
          {t("Price")}
        </h2>
        {covered ? <Alert tone="success">{t("This consultation is already paid for.")}</Alert> : null}
        <dl className="space-y-2 text-[0.9375rem]">
          <div className="flex justify-between gap-4">
            <dt>{isClinic ? t("Clinic visit fee") : t("Doctor's fee")}</dt>
            <dd>{covered ? <s className="text-fg-muted">{money(a.feeMinor)}</s> : money(q.feeMinor)}</dd>
          </div>
          {q.creditMinor ? (
            <div className="flex justify-between gap-4 text-success">
              <dt>{t("Credit from your online consultation")}</dt>
              <dd>
                <span className="sr-only">{t("minus")} </span>
                {`−${money(q.creditMinor)}`}
              </dd>
            </div>
          ) : null}
          {q.discountMinor ? (
            <div className="flex justify-between gap-4 text-success">
              <dt>{t("Coupon {code}", { code: coupon?.code ?? "" })}</dt>
              <dd>
                <span className="sr-only">{t("minus")} </span>
                {`−${money(q.discountMinor)}`}
              </dd>
            </div>
          ) : null}
          {q.platformFeeMinor ? (
            <div className="flex justify-between gap-4">
              <dt>{t("Platform fee")}</dt>
              <dd>{money(q.platformFeeMinor)}</dd>
            </div>
          ) : null}
          {q.taxLines.map((l) => (
            <div key={l.label} className="flex justify-between gap-4 text-fg-muted">
              <dt>
                {t(l.label)} ({Math.round(l.rate * 1000) / 10}%)
              </dt>
              <dd>{money(l.amountMinor)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-line pt-2 text-lg font-extrabold text-heading">
            <dt>{t("Total to pay")}</dt>
            <dd>{money(q.totalMinor)}</dd>
          </div>
        </dl>
        {direct ? (
          <p className="text-sm text-fg-muted">{t("You pay this fee directly to the doctor, by UPI or bank transfer.")}</p>
        ) : a.currency === "INR" ? (
          <p className="text-sm text-fg-muted">{t("A doctor's consultation is exempt from GST. GST applies only to the platform fee. You will get a GST invoice.")}</p>
        ) : (
          <p className="text-sm text-fg-muted">
            {t("You pay in {currency}. The price uses the exchange rate of {date}.", { currency: a.currency, date: ctx.rates[a.currency as keyof typeof ctx.rates]?.asOf ?? "" })}
          </p>
        )}
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="rules">
        <h2 id="rules" className="text-lg font-bold">
          {t("Before you pay")}
        </h2>
        <ul className="space-y-2.5 text-[0.9375rem]">
          {a.policySnapshot?.refund ? (
            <li className="flex gap-2">
              <Undo2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              {t(a.policySnapshot.refund)}
            </li>
          ) : null}
          {a.policySnapshot?.reschedule ? (
            <li className="flex gap-2">
              <RotateCcw className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              {t(a.policySnapshot.reschedule)}
            </li>
          ) : null}
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            {direct
              ? t("You pay the doctor directly. Your booking is confirmed when the doctor receives the money.")
              : t("Your payment is held safely. The doctor is paid only after the consultation.")}
          </li>
          <li className="flex gap-2">
            <BellRing className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            {t("We will remind you 24 hours, 1 hour and 10 minutes before the consultation.")}
          </li>
          {!isClinic ? (
            <li className="flex gap-2">
              <Stethoscope className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              {t("If your doctor feels you need to be seen in person, they will tell you what to do next.")}
            </li>
          ) : null}
        </ul>
        <p className="text-sm">
          <Link href="/legal/refunds" className="text-primary underline">
            {t("Refund and cancellation policy")}
          </Link>
        </p>
      </section>

      <section className="card p-5" aria-label={t("Payment")}>
        <PayPanel
          apptId={a.id}
          methods={[...METHODS_BY_CURRENCY(a.currency)]}
          totalLabel={money(q.totalMinor)}
          couponCode={coupon?.code ?? null}
          covered={q.totalMinor === 0}
          holdUntil={slot?.heldUntil?.toISOString() ?? null}
          testGateway={gateway === "demo"}
          direct={direct}
        />
        {gateway === "demo" && q.totalMinor > 0 ? (
          <p className="mt-3 rounded-xl bg-surface-2 p-3 text-center text-sm text-fg-muted">{t("Online payment is not connected yet. The next page is a test payment that does not take any money.")}</p>
        ) : null}
        {isClinic && q.totalMinor > 0 ? (
          <form action={payAtClinicAction.bind(null, a.id)} className="mt-4 border-t border-line pt-4">
            <SubmitButton variant="outline" className="w-full">
              {t("Pay at the clinic instead")}
            </SubmitButton>
            <p className="mt-1 text-center text-sm text-fg-muted">{t("Pay at the reception desk on the day. Your time is confirmed now.")}</p>
          </form>
        ) : null}
      </section>
    </div>
  );
}
