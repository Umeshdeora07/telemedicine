import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Clock, Landmark, Smartphone } from "lucide-react";
import { getDb } from "@/db";
import { appointments, doctors, payments } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { requireUser } from "@/server/auth/session";
import { HOLD_MINUTES } from "@/server/booking";
import { acceptsDirectPayment } from "@/lib/direct-payment";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { DirectPayForm } from "@/components/booking/direct-pay-form";

export const metadata: Metadata = { title: "Pay the doctor", robots: { index: false } };

/**
 * Patients pay the doctor directly, by UPI or bank transfer, using the
 * doctor's own details. Then they enter the payment reference and the doctor
 * confirms when the money arrives.
 */
export default async function DirectPayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const db = await getDb();
  const [row] = await db
    .select({ p: payments, a: appointments, doctorName: doctors.fullName, details: doctors.paymentDetails })
    .from(payments)
    .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .where(and(eq(payments.id, id), eq(payments.userId, user.id), eq(payments.gateway, "direct")));
  if (!row) notFound();
  const { p, a, doctorName, details } = row;
  if (p.status === "captured" || p.submittedAt) redirect(`/book/done/${a.id}`);
  const { t, fmt } = await getViewContext();
  if (a.status !== "pending_payment" || !acceptsDirectPayment(details)) {
    return (
      <Alert tone="warning" title={t("This booking is no longer waiting for payment")}>
        <Link href="/doctors" className="font-semibold underline">{t("Choose a time again")}</Link>
      </Alert>
    );
  }
  // Doctors are paid in rupees; patients abroad also see their own currency.
  const inrMinor = Math.round(p.amountMinor / (p.fxRate || 1));
  const amountInr = fmt.money(inrMinor, "INR");
  const upiLink = details.upiId
    ? `upi://pay?${new URLSearchParams({ pa: details.upiId, pn: details.accountName || doctorName, am: (inrMinor / 100).toFixed(2), cu: "INR", tn: `Booking ${a.ref}` }).toString()}`
    : null;
  const bank = details.accountNumber && details.ifsc && details.accountName;
  const methods = [...(details.upiId || details.qrDocumentId ? (["upi"] as const) : []), ...(bank ? (["bank"] as const) : []), "other" as const];
  const rows: [string, string | undefined][] = [
    [t("Account holder"), details.accountName],
    [t("Bank"), details.bankName],
    [t("Account number"), details.accountNumber],
    [t("IFSC code"), details.ifsc],
    [t("SWIFT code (international transfers)"), details.swift],
  ];

  return (
    <div className="space-y-6">
      <Stepper current={3} total={4} label={t("Step {current} of {total}: pay", { current: 3, total: 4 })} />
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t("Pay {doctor}", { doctor: doctorName })}</h1>
        <p className="text-fg-muted">{t("You pay the doctor directly. After paying, enter the payment reference below. The doctor confirms your booking when the money arrives.")}</p>
      </div>

      <section className="card space-y-1 p-5 text-center" aria-label={t("Amount to pay")}>
        <p className="text-fg-muted">{t("Amount to pay")}</p>
        <p className="text-4xl font-extrabold text-heading">{amountInr}</p>
        {p.currency !== "INR" ? <p className="text-fg-muted">{t("About {amount} in your currency. Your bank may add its own charges.", { amount: fmt.money(p.amountMinor, p.currency) })}</p> : null}
        <p className="text-sm text-fg-muted">{t("Booking ref {ref}. Please add it to the payment note.", { ref: a.ref })}</p>
      </section>

      <p className="flex items-start gap-2 rounded-xl bg-primary-soft p-3 text-sm text-primary-soft-fg">
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
        {t("Your time is held for {n} minutes. Once you enter the payment reference, it stays held until the doctor confirms.", { n: HOLD_MINUTES })}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {details.upiId || details.qrDocumentId ? (
          <section className="card space-y-3 p-5" aria-labelledby="pay-upi">
            <h2 id="pay-upi" className="flex items-center gap-2 text-lg font-bold">
              <Smartphone className="size-5 text-primary" aria-hidden />
              {t("Pay by UPI")}
            </h2>
            {details.qrDocumentId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/payments/${p.id}/qr`} alt={t("UPI QR code of {doctor}", { doctor: doctorName })} width={240} height={240} className="mx-auto size-60 rounded-xl border border-line bg-white object-contain p-2" />
            ) : null}
            {details.upiId ? (
              <p className="text-center">
                {t("UPI ID")}: <strong className="font-mono">{details.upiId}</strong>
              </p>
            ) : null}
            {upiLink ? (
              <ButtonLink href={upiLink} variant="secondary" className="w-full md:hidden">
                {t("Open my UPI app")}
              </ButtonLink>
            ) : null}
            <p className="text-sm text-fg-muted">{t("Scan the code with any UPI app (Google Pay, PhonePe, Paytm or your bank app) and pay {amount}.", { amount: amountInr })}</p>
          </section>
        ) : null}
        {bank || details.notes ? (
          <section className="card space-y-3 p-5" aria-labelledby="pay-bank">
            <h2 id="pay-bank" className="flex items-center gap-2 text-lg font-bold">
              <Landmark className="size-5 text-primary" aria-hidden />
              {bank ? t("Pay by bank transfer") : t("Other ways to pay")}
            </h2>
            {bank ? (
              <dl className="space-y-2 text-[0.9375rem]">
                {rows
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="flex flex-col sm:flex-row sm:justify-between sm:gap-3">
                      <dt className="text-sm text-fg-muted">{k}</dt>
                      <dd className="break-words font-semibold text-heading sm:text-end">{v}</dd>
                    </div>
                  ))}
              </dl>
            ) : null}
            {details.notes ? <p className="whitespace-pre-line text-sm">{details.notes}</p> : null}
          </section>
        ) : null}
      </div>

      <section className="card space-y-3 p-5" aria-labelledby="paid">
        <h2 id="paid" className="text-lg font-bold">{t("After you pay")}</h2>
        <DirectPayForm paymentId={p.id} appointmentId={a.id} methods={methods} />
      </section>
    </div>
  );
}
