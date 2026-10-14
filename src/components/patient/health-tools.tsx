"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { addReadingAction, addReminderAction, emergencyCardAction, logDoseAction, toggleReminderAction, type PState } from "@/server/actions/patient-app";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function DoseButtons({ reminderId, at, status }: { reminderId: string; at: string; status: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [s, setS] = useState(status);
  const log = (v: "taken" | "skipped") => start(async () => { setS(v); await logDoseAction(reminderId, at, v); router.refresh(); });
  return (
    <span className="flex gap-2">
      <button type="button" disabled={pending} aria-pressed={s === "taken"} onClick={() => log("taken")} className={cn("tap inline-flex items-center gap-1 rounded-xl border px-3 font-semibold", s === "taken" ? "border-success bg-success-soft text-success" : "border-line hover:bg-surface-2")}><Check className="size-4" aria-hidden />{t("Taken")}</button>
      <button type="button" disabled={pending} aria-pressed={s === "skipped"} onClick={() => log("skipped")} className={cn("tap inline-flex items-center gap-1 rounded-xl border px-3", s === "skipped" ? "border-warning bg-warning-soft" : "border-line hover:bg-surface-2")}><X className="size-4" aria-hidden />{t("Skipped")}</button>
    </span>
  );
}

export function ReminderToggle({ id, active }: { id: string; active: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await toggleReminderAction(id, !active); router.refresh(); })}>{active ? t("Pause") : t("Resume")}</Button>;
}

export function AddReminderForm({ people }: { people: { id: string; name: string }[] }) {
  const { t } = useI18n();
  const [s, action] = useActionState(addReminderAction, {} as PState);
  const [times, setTimes] = useState(["09:00"]);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {s.ok ? <Alert tone="success" className="sm:col-span-2">{t("Reminder added.")}</Alert> : null}
      {s.error ? <Alert tone="danger" className="sm:col-span-2">{s.error}</Alert> : null}
      {people.length > 1 ? <Field label={t("For")} htmlFor="r-p"><Select id="r-p" name="patientId">{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field> : <input type="hidden" name="patientId" value={people[0]?.id} />}
      <Field label={t("Medicine")} htmlFor="r-name" required><Input id="r-name" name="name" placeholder={t("Metformin 500 mg")} /></Field>
      <Field label={t("Dose")} htmlFor="r-dose" required><Input id="r-dose" name="dose" placeholder={t("1 tablet")} /></Field>
      <Field label={t("For how many days")} htmlFor="r-days" hint={t("Leave empty if ongoing.")}><Input id="r-days" name="days" type="number" min={1} max={365} /></Field>
      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="font-medium">{t("Times")}</legend>
        <div className="flex flex-wrap items-center gap-2">
          {times.map((tm, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <label className="sr-only" htmlFor={`r-t${i}`}>{t("Time {n}", { n: i + 1 })}</label>
              <Input id={`r-t${i}`} name="times" type="time" value={tm} onChange={(e) => setTimes((x) => x.map((v, j) => (j === i ? e.target.value : v)))} className="w-32" />
              {times.length > 1 ? <button type="button" onClick={() => setTimes((x) => x.filter((_, j) => j !== i))} className="tap grid place-items-center rounded-lg text-fg-muted hover:text-danger" aria-label={t("Remove time")}><X className="size-4" aria-hidden /></button> : null}
            </span>
          ))}
          {times.length < 6 ? <Button size="sm" variant="ghost" onClick={() => setTimes((x) => [...x, "21:00"])}>{t("Add time")}</Button> : null}
        </div>
      </fieldset>
      <Field label={t("Instructions")} htmlFor="r-ins" className="sm:col-span-2"><Input id="r-ins" name="instructions" placeholder={t("After food")} /></Field>
      <div className="sm:col-span-2"><SubmitButton variant="secondary">{t("Add reminder")}</SubmitButton></div>
    </form>
  );
}

export function AddReadingForm({ patientId, types }: { patientId: string; types: { key: string; label: string; unit: string }[] }) {
  const { t } = useI18n();
  const [s, action] = useActionState(addReadingAction, {} as PState);
  const [type, setType] = useState(types[0]!.key);
  const unit = types.find((x) => x.key === type)?.unit ?? "";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="patientId" value={patientId} />
      {s.urgent ? (
        <Alert tone="danger" title={t("This reading is outside the safe range")} className="sm:col-span-4">
          {t("If you feel unwell — chest pain, breathlessness, confusion, fainting, severe headache — go to the nearest emergency department or call emergency services now. Otherwise, talk to a doctor today.")}{" "}
          <a href="/emergency" className="font-semibold underline">{t("Emergency help")}</a> · <a href="/consult-now" className="font-semibold underline">{t("Consult a doctor now")}</a>
        </Alert>
      ) : s.ok ? <Alert tone="success" className="sm:col-span-4">{t("Saved.")}</Alert> : null}
      {s.error ? <Alert tone="danger" className="sm:col-span-4">{s.error}</Alert> : null}
      <Field label={t("What")} htmlFor="rd-type" required><Select id="rd-type" name="type" value={type} onChange={(e) => setType(e.target.value)}>{types.map((x) => <option key={x.key} value={x.key}>{t(x.label)}</option>)}</Select></Field>
      {type === "bp" ? (
        <div className="flex items-end gap-2">
          <Field label={t("Upper")} htmlFor="rd-v" required><Input id="rd-v" name="value" inputMode="numeric" required className="w-20" /></Field>
          <span className="pb-3">/</span>
          <Field label={t("Lower")} htmlFor="rd-v2" required><Input id="rd-v2" name="value2" inputMode="numeric" required className="w-20" /></Field>
        </div>
      ) : (
        <Field label={t("Value ({unit})", { unit })} htmlFor="rd-v" required><Input id="rd-v" name="value" inputMode="decimal" required /></Field>
      )}
      <Field label={t("When")} htmlFor="rd-at" hint={t("Leave empty for now.")}><Input id="rd-at" name="takenAt" type="datetime-local" /></Field>
      <SubmitButton>{t("Save reading")}</SubmitButton>
    </form>
  );
}

export function EmergencyCardToggle({ patientId, on }: { patientId: string; on: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant={on ? "ghost" : "primary"} disabled={pending} onClick={() => start(async () => { await emergencyCardAction(patientId, !on); router.refresh(); })}>
      {on ? t("Turn off the card") : t("Turn on my emergency card")}
    </Button>
  );
}
