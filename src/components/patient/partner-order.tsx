"use client";

import { useState, useTransition } from "react";
import { FlaskConical, Pill } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { partnerOrderAction } from "@/server/actions/after-consult";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";

export function PartnerOrder({ apptId, kind, prescriptionId, defaultAddress }: { apptId: string; kind: "pharmacy" | "lab"; prescriptionId: string | null; defaultAddress: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState(defaultAddress);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {kind === "pharmacy" ? <Pill className="size-5" aria-hidden /> : <FlaskConical className="size-5" aria-hidden />}
        {kind === "pharmacy" ? t("Order medicines") : t("Book lab tests at home")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={kind === "pharmacy" ? t("Order medicines") : t("Book lab tests")} closeLabel={t("Close")}>
        {msg ? (
          <p role="status">{msg}</p>
        ) : (
          <div className="space-y-4">
            <p className="text-fg-muted">{kind === "pharmacy" ? t("A partner pharmacy delivers the medicines on your e-prescription. You pay them on delivery.") : t("A partner lab collects samples at home. You pay the lab directly.")}</p>
            <Field label={kind === "pharmacy" ? t("Delivery address") : t("Address for sample collection")} htmlFor="po-addr" required>
              <Textarea id="po-addr" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <Button className="w-full" disabled={pending || address.trim().length < 8} onClick={() => start(async () => { const r = await partnerOrderAction(apptId, kind, prescriptionId, address); setMsg(r.ok ? t("Order placed with the partner. Reference: {ref}. They'll call to confirm.", { ref: r.ref ?? "" }) : r.error); })}>
              {t("Place order")}
            </Button>
            <p className="text-xs text-fg-muted">{t("Demo: partner integrations are simulated.")}</p>
          </div>
        )}
      </Dialog>
    </>
  );
}
