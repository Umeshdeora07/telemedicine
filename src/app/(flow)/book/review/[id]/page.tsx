import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { CalendarClock, Info, RotateCcw, ShieldCheck, Undo2 } from "lucide-react";
import { getViewContext } from "@/server/context";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/db";
import { appointments, availabilitySlots, clinics, coupons, doctors, patients, specialties, subscriptions, plans } from "@/db/schema";
import { quoteForAppointment } from "@/server/booking";
import { describeLocation } from "@/server/location";
import { METHODS_BY_CURRENCY, pickGateway } from "@/server/payments/gateways";
import { sameClock } from "@/lib/time";
import { Stepper } from "@/components/ui/stepper";
import { Alert } from "@/components/ui/alert";
import { DoctorAvatar } from "@/components/ui/avatar";
import { PayPanel } from "@/components/booking/pay-panel";

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
      <Alert tone="warning" title={t("This booking expired")}>
        {t("We could only hold the time for 15 minutes.")} <Link className="font-semibold text-primary underline" href={`/book/${d.slug}?mode=${a.mode}`}>{t("Pick a new time")}</Link>
      </Alert>
    );
  }
  const [coupon] = a.couponId ? await db.select().from(coupons).where(eq(coupons.id, a.couponId)) : [];
  const q = await quoteForAppointment(a, coupon ?? null);
  const [slot] = a.slotId ? await db.select().from(availabilitySlots).where(eq(availabilitySlots.id, a.slotId)) : [];
  const [clinic] = a.clinicId ? await db.select().from(clinics).where(eq(clinics.id, a.clinicId)) : [];
  const [plan] = a.subscriptionId
    ? await db.select({ name: plans.name }).from(subscriptions).innerJoin(plans, eq(plans.id, subscriptions.planId)).where(eq(subscriptions.id, a.subscriptionId))
    : [];
  const money = (m: number) => fmt.money(m, a.currency);
  const where = await describeLocation({ country: a.patientLocationCountry, region: a.patientLocationRegion });
  const modeLabel = { video: t("Video consult"), audio: t("Audio call"), chat: t("Chat consult"), in_clinic: t("Clinic visit") }[a.mode];
  const gateway = pickGateway(a.currency);

  return (
    <div className="space-y-6">
      <Stepper current={3} total={4} label={t("Step {current} of {total}: review and pay", { current: 3, total: 4 })} />
      <h1 className="text-2xl font-extrabold">{t("Check and pay")}</h1>
      {sp.cancelled ? <Alert tone="warning">{t("Payment was cancelled. No money was taken.")}</Alert> : null}

      <section className="card space-y-4 p-5" aria-label={t("Booking summary")}>
        <div className="flex items-center gap-3">
          <DoctorAvatar name={d.fullName} seed={d.avatarSeed} gender={d.gender} photoUrl={d.photoUrl} size={52} senior={d.experienceYears >= 20} />
          <div>
            <p className="font-bold text-heading">{d.fullName}</p>
            <p className="text-fg-muted">{t(row.s.name)}</p>
          </div>
        </div>
        <dl className="grid gap-3 text-[0.9375rem] sm:grid-cols-2">
          <div>
            <dt className="text-fg-muted">{t("Patient")}</dt>
            <dd className="font-semibold">{p.fullName}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">{t("Type")}</dt>
            <dd className="font-semibold">
              {modeLabel} · {t("{n} minutes", { n: a.policySnapshot?.consultMinutes ?? d.consultMinutes })}
              {a.consultType === "follow_up" ? ` · ${t("Follow-up")}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted">{t("When (your time)")}</dt>
            <dd className="font-semibold">
              {fmt.dateTime(a.startAt)} <span className="font-normal text-fg-muted">{fmt.zone()}</span>
            </dd>
            {!sameClock(a.patientTimeZone, ctx.tz, a.startAt) ? (
              <dd className="text-sm text-fg-muted">
                {t("Patient's time: {time}", { time: fmt.dateTime(a.startAt, a.patientTimeZone) })} {fmt.zone(a.patientTimeZone)}
              </dd>
            ) : null}
            {!sameClock(a.doctorTimeZone, ctx.tz, a.startAt) ? <dd className="text-sm text-fg-muted">{t("Doctor's time: {time}", { time: fmt.dateTime(a.startAt, a.doctorTimeZone) })}</dd> : null}
          </div>
          <div>
            <dt className="text-fg-muted">{a.mode === "in_clinic" ? t("Where") : t("Patient's location")}</dt>
            <dd className="font-semibold">{clinic ? `${clinic.name}, ${clinic.city}` : where.label}</dd>
          </div>
        </dl>
        <p className="text-sm">
          <Link href={`/book/${d.slug}?mode=${a.mode}`} className="font-semibold text-primary underline">{t("Change")}</Link>
        </p>
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="price">
        <h2 id="price" className="text-lg font-bold">{t("Price")}</h2>
        {plan ? <Alert tone="success">{t("Covered by your {plan}.", { plan: t(plan.name) })}</Alert> : null}
        <dl className="space-y-2 text-[0.9375rem]">
          <div className="flex justify-between gap-4">
            <dt>{t("Doctor's fee")}</dt>
            <dd>{plan ? <s className="text-fg-muted">{money(a.feeMinor)}</s> : money(q.feeMinor)}</dd>
          </div>
          {q.creditMinor ? (
            <div className="flex justify-between gap-4 text-success">
              <dt>{t("Credit from your online consult")}</dt>
              <dd>−{money(q.creditMinor)}</dd>
            </div>
          ) : null}
          {q.discountMinor ? (
            <div className="flex justify-between gap-4 text-success">
              <dt>{t("Coupon {code}", { code: coupon?.code ?? "" })}</dt>
              <dd>−{money(q.discountMinor)}</dd>
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
              <dt>{t(l.label)} ({Math.round(l.rate * 1000) / 10}%)</dt>
              <dd>{money(l.amountMinor)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-line pt-2 text-lg font-extrabold text-heading">
            <dt>{t("Total")}</dt>
            <dd>{money(q.totalMinor)}</dd>
          </div>
        </dl>
        {a.currency === "INR" ? <p className="text-sm text-fg-muted">{t("Consultation by a doctor is exempt from GST. GST applies to the platform fee. You'll get a GST invoice.")}</p> : <p className="text-sm text-fg-muted">{t("Charged in {currency}. Converted at the rate of {date}.", { currency: a.currency, date: ctx.rates[a.currency as keyof typeof ctx.rates]?.asOf ?? "" })}</p>}
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="rules">
        <h2 id="rules" className="text-lg font-bold">{t("Before you pay")}</h2>
        <ul className="space-y-2 text-[0.9375rem]">
          <li className="flex gap-2"><Undo2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />{t(a.policySnapshot?.refund ?? "")}</li>
          <li className="flex gap-2"><RotateCcw className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />{t(a.policySnapshot?.reschedule ?? "")}</li>
          <li className="flex gap-2"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />{t("Your payment is held safely and the doctor is paid only after the consult.")}</li>
          <li className="flex gap-2"><CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />{t("Reminders by SMS or WhatsApp, email and app at 24 hours, 1 hour and 10 minutes before.")}</li>
          <li className="flex gap-2"><Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />{t("The doctor may decide you need an in-person visit. You can then book the clinic visit in one tap.")}</li>
        </ul>
        <p className="text-sm">
          <Link href="/legal/refunds" className="text-primary underline">{t("Full refund and cancellation policy")}</Link>
        </p>
      </section>

      <section className="card p-5">
        <PayPanel
          apptId={a.id}
          methods={[...METHODS_BY_CURRENCY(a.currency)]}
          totalLabel={money(q.totalMinor)}
          couponCode={coupon?.code ?? null}
          covered={q.totalMinor === 0}
          holdUntil={slot?.heldUntil?.toISOString() ?? null}
        />
        {gateway === "demo" ? <p className="mt-3 text-center text-sm text-warning">{t("Demo: you'll see a test payment page. No real money moves.")}</p> : null}
      </section>
    </div>
  );
}
