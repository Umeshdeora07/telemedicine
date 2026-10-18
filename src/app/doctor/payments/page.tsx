import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { getViewContext } from "@/server/context";
import { doctorForUser } from "@/server/consult";
import { doctorPaymentQueue } from "@/server/direct-payments";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentDecision, RefundSent } from "@/components/doctor/payment-actions";

export const metadata: Metadata = { title: "Payments" };

export default async function DoctorPayments() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const d = (await doctorForUser(ctx.user!))!;
  const { toConfirm, toRefund } = await doctorPaymentQueue(d.id);
  const method = { upi: t("UPI"), bank: t("Bank transfer"), other: t("Other") } as Record<string, string>;
  const inr = (amountMinor: number, rate: number | null) => fmt.money(Math.round(amountMinor / (rate || 1)), "INR");
  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title={t("Payments")} description={t("Patients pay you directly. Check that the money has reached your account, then confirm the booking. If it has not arrived, say so and the time is freed.")} />

      <section className="space-y-3" aria-labelledby="confirm">
        <h2 id="confirm" className="text-xl font-bold">{t("Payments to confirm")}</h2>
        {toConfirm.length ? (
          <ul className="space-y-3">
            {toConfirm.map(({ p, appt, patientName }) => (
              <li key={p.id} className="card space-y-3 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-heading">{patientName}</p>
                  <p className="text-2xl font-extrabold text-heading">
                    {inr(p.amountMinor, p.fxRate)}
                    {p.currency !== "INR" ? <span className="ms-2 text-sm font-normal text-fg-muted">({fmt.money(p.amountMinor, p.currency)})</span> : null}
                  </p>
                </div>
                <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                  <dt className="text-fg-muted">{t("Consultation")}</dt>
                  <dd>{fmt.dateTime(appt.startAt, d.timeZone)} · {t("Booking ref")} {appt.ref}</dd>
                  <dt className="text-fg-muted">{t("Paid by")}</dt>
                  <dd>{method[p.method ?? ""] ?? t("Other")}</dd>
                  <dt className="text-fg-muted">{t("Payment reference")}</dt>
                  <dd className="font-mono">{p.gatewayPaymentId}</dd>
                  <dt className="text-fg-muted">{t("Sent on")}</dt>
                  <dd>{p.submittedAt ? fmt.dateTime(p.submittedAt, d.timeZone) : null}</dd>
                </dl>
                {p.proofDocumentId ? (
                  <a href={`/api/documents/${p.proofDocumentId}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary underline">
                    <FileText className="size-4" aria-hidden />
                    {t("Payment screenshot")}
                  </a>
                ) : null}
                <PaymentDecision paymentId={p.id} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("Nothing to confirm")}>{t("When a patient pays you, the payment appears here for you to confirm.")}</EmptyState>
        )}
      </section>

      {toRefund.length ? (
        <section className="space-y-3" aria-labelledby="refunds">
          <h2 id="refunds" className="text-xl font-bold">{t("Refunds to send")}</h2>
          <p className="text-fg-muted">{t("Send this money back to the patient the same way they paid you, then mark it as sent.")}</p>
          <ul className="space-y-3">
            {toRefund.map(({ r, p, appt, patientName }) => (
              <li key={r.id} className="card space-y-2 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-heading">{patientName}</p>
                  <p className="text-xl font-extrabold text-heading">{inr(r.amountMinor, p.fxRate)}</p>
                </div>
                <p className="text-sm text-fg-muted">
                  {t("Booking ref")} {appt.ref} · {t("Reason")}: {r.reason} · {t("Their payment reference")}: <span className="font-mono">{p.gatewayPaymentId}</span>
                </p>
                <RefundSent refundId={r.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
