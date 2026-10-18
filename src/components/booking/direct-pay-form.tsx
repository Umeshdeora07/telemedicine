"use client";

import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { submitDirectPaymentAction, type DirectPayState } from "@/server/actions/direct-pay";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { FileUploader } from "@/components/common/file-uploader";

/** After paying the doctor, the patient enters the payment reference (and can add a screenshot). */
export function DirectPayForm({ paymentId, appointmentId, methods }: { paymentId: string; appointmentId: string; methods: ("upi" | "bank" | "other")[] }) {
  const { t } = useI18n();
  const [state, action] = useActionState(submitDirectPaymentAction, {} as DirectPayState);
  const label = { upi: t("UPI"), bank: t("Bank transfer"), other: t("Other") };
  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <input type="hidden" name="paymentId" value={paymentId} />
      <fieldset>
        <legend className="mb-2 font-semibold text-heading">{t("How did you pay?")}</legend>
        <div className="flex flex-wrap gap-2">
          {methods.map((m, i) => (
            <label key={m} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-field px-4 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
              <input type="radio" name="method" value={m} defaultChecked={i === 0} className="size-5 accent-[var(--primary)]" />
              {label[m]}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t("Payment reference")} htmlFor="reference" required hint={t("The UTR or transaction ID shown in your payment app or bank after paying.")}>
        <Input id="reference" name="reference" required minLength={4} maxLength={60} autoComplete="off" />
      </Field>
      <FileUploader fields={{ appointmentId, title: "Payment screenshot" }} category="other" name="proofDocumentId" label={t("Screenshot of the payment (optional)")} />
      <SubmitButton size="lg" className="w-full" pendingText={t("Sending…")}>
        {t("I have paid")}
      </SubmitButton>
    </form>
  );
}
