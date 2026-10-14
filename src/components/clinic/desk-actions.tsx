"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { checkInAction, deskPaymentAction } from "@/server/actions/clinic";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function DeskActions({ apptId, code, canCheckIn, needsPayment, amount }: { apptId: string; code: string | null; canCheckIn: boolean; needsPayment: boolean; amount: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"upi" | "cash" | "card">("upi");
  return (
    <div className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {canCheckIn && code ? (
        <Button size="lg" disabled={pending} onClick={() => start(async () => { const r = await checkInAction({ code }); if (r.error) setError(r.error); else router.refresh(); })}>
          {t("Check in now")}
        </Button>
      ) : null}
      {needsPayment ? (
        <fieldset className="space-y-2">
          <legend className="font-semibold">{t("Collect {amount} at the desk", { amount })}</legend>
          <div className="flex flex-wrap gap-2">
            {(["upi", "cash", "card"] as const).map((m) => (
              <label key={m} className="tap flex items-center gap-2 rounded-xl border border-line px-3">
                <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="size-5 accent-[var(--primary)]" />
                {m === "upi" ? "UPI" : m === "cash" ? t("Cash") : t("Card")}
              </label>
            ))}
          </div>
          <Button variant="secondary" disabled={pending} onClick={() => start(async () => { const r = await deskPaymentAction(apptId, method); if (!r.ok) setError(r.error); else router.refresh(); })}>
            {t("Mark as paid and issue invoice")}
          </Button>
        </fieldset>
      ) : null}
    </div>
  );
}
