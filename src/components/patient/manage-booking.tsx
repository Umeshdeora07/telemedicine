"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { cancelBookingAction, rescheduleAction } from "@/server/actions/booking";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export function ManageBooking({ apptId, refundLabel, canReschedule, slots }: { apptId: string; refundLabel: string; canReschedule: boolean; slots: { id: string; label: string }[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState<"cancel" | "reschedule" | null>(null);
  const [reason, setReason] = useState("");
  const [slot, setSlot] = useState(slots[0]?.id ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {canReschedule ? <Button variant="outline" onClick={() => setOpen("reschedule")}>{t("Reschedule")}</Button> : null}
      <Button variant="ghost" className="text-danger" onClick={() => setOpen("cancel")}>{t("Cancel booking")}</Button>
      <Dialog open={open === "cancel"} onClose={() => setOpen(null)} title={t("Cancel this booking?")} closeLabel={t("Close")}>
        <div className="space-y-4">
          <Alert tone="info">{refundLabel}</Alert>
          <label htmlFor="cancel-reason" className="font-medium">{t("Reason (optional)")}</label>
          <Textarea id="cancel-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          {msg ? <p role="status" className={msg.ok ? "text-success" : "text-danger"}>{msg.text}</p> : null}
          <div className="flex gap-2">
            <Button variant="danger" disabled={pending} onClick={() => start(async () => { const r = await cancelBookingAction(apptId, reason); if (r.ok) { setOpen(null); router.refresh(); } else setMsg({ ok: false, text: r.error }); })}>{t("Yes, cancel")}</Button>
            <Button variant="outline" onClick={() => setOpen(null)}>{t("Keep booking")}</Button>
          </div>
        </div>
      </Dialog>
      <Dialog open={open === "reschedule"} onClose={() => setOpen(null)} title={t("Choose a new time")} closeLabel={t("Close")}>
        <div className="space-y-4">
          {slots.length ? (
            <>
              <label htmlFor="new-slot" className="font-medium">{t("Free times with the same doctor")}</label>
              <Select id="new-slot" value={slot} onChange={(e) => setSlot(e.target.value)}>
                {slots.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </Select>
              {msg ? <p role="status" className={msg.ok ? "text-success" : "text-danger"}>{msg.text}</p> : null}
              <Button disabled={pending || !slot} onClick={() => start(async () => { const r = await rescheduleAction(apptId, slot); if (r.ok) { setOpen(null); router.refresh(); } else setMsg({ ok: false, text: r.error }); })}>{t("Move my booking")}</Button>
            </>
          ) : <p>{t("No free times in the next 2 weeks.")}</p>}
        </div>
      </Dialog>
    </div>
  );
}
