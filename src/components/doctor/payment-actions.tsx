"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { confirmPaymentAction, markRefundSentAction, rejectPaymentAction } from "@/server/actions/doctor";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/field";

/** Confirm that a patient's direct payment arrived, or say it did not. */
export function PaymentDecision({ paymentId }: { paymentId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const run = (fn: () => Promise<{ ok?: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else router.refresh();
    });
  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {rejecting ? (
        <div className="space-y-2">
          <label htmlFor={`reason-${paymentId}`} className="block text-sm font-medium text-heading">{t("What should the patient know? (optional)")}</label>
          <Input id={`reason-${paymentId}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={t("For example: no payment with this reference has reached my account")} />
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" disabled={pending} onClick={() => run(() => rejectPaymentAction(paymentId, reason))}>{t("Payment not received, cancel booking")}</Button>
            <Button variant="ghost" disabled={pending} onClick={() => setRejecting(false)}>{t("Back")}</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending} onClick={() => run(() => confirmPaymentAction(paymentId))}>{t("Payment received, confirm booking")}</Button>
          <Button variant="outline" disabled={pending} onClick={() => setRejecting(true)}>{t("Not received")}</Button>
        </div>
      )}
    </div>
  );
}

export function RefundSent({ refundId }: { refundId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await markRefundSentAction(refundId);
            if (r.error) setError(r.error);
            else router.refresh();
          })
        }
      >
        {t("I have sent the refund")}
      </Button>
    </div>
  );
}
