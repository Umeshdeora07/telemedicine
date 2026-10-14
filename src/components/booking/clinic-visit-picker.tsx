"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { bookClinicVisitAction } from "@/server/actions/hybrid";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type Opt = { doctorId: string; doctorName: string; clinicName: string; slots: { id: string; label: string; day: string }[] };

export function ClinicVisitPicker({ parentId, options }: { parentId: string; options: Opt[] }) {
  const { t } = useI18n();
  const [docIdx, setDocIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const opt = options[docIdx];
  const days = [...new Set(opt?.slots.map((s) => s.day))];
  return (
    <div className="space-y-4">
      {options.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("Doctor")}>
          {options.map((o, i) => (
            <button key={o.doctorId} type="button" role="radio" aria-checked={i === docIdx} onClick={() => { setDocIdx(i); setSlot(null); }} className={cn("tap rounded-xl border px-3 text-start", i === docIdx ? "border-primary bg-primary-soft" : "border-field")}>
              <span className="block font-semibold">{o.doctorName}</span>
              <span className="text-sm text-fg-muted">{o.clinicName}</span>
            </button>
          ))}
        </div>
      ) : null}
      {opt && opt.slots.length ? (
        days.map((d) => (
          <div key={d}>
            <h3 className="mb-1.5 text-sm font-semibold">{d}</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {opt.slots.filter((s) => s.day === d).map((s) => (
                <button key={s.id} type="button" aria-pressed={slot === s.id} onClick={() => setSlot(s.id)} className={cn("tap rounded-xl border font-semibold", slot === s.id ? "border-primary bg-primary-soft ring-2 ring-primary" : "border-field")}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ))
      ) : (
        <Alert tone="warning">{t("No clinic slots in the next 2 weeks. Ask for a call back and our team will arrange one.")}</Alert>
      )}
      {err ? <p role="alert" className="text-danger">{err}</p> : null}
      <Button size="lg" className="w-full" disabled={!slot || pending} onClick={() => start(async () => { const r = await bookClinicVisitAction(parentId, slot!, opt!.doctorId); if (r?.error) setErr(r.error); })}>
        {t("Continue")}
      </Button>
    </div>
  );
}
