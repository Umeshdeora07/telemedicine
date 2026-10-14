"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Copy } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { assignInterpreterAction, assistedBookingAction, callbackAction, type AssistState } from "@/server/actions/coordinator";
import { Button } from "@/components/ui/button";
import { Checkbox, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function CallbackControls({ id, status }: { id: string; status: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState("");
  if (status === "done") return null;
  return (
    <div className="space-y-2">
      {status === "open" ? (
        <Button size="sm" disabled={pending} onClick={() => start(() => callbackAction(id, "in_progress"))}>{t("I'll call now")}</Button>
      ) : (
        <>
          <label htmlFor={`o-${id}`} className="text-sm font-medium">{t("Outcome")}</label>
          <Textarea id={`o-${id}`} rows={2} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder={t("What did you help with?")} />
          <Button size="sm" variant="secondary" disabled={pending || outcome.trim().length < 3} onClick={() => start(() => callbackAction(id, "done", outcome))}>{t("Mark done")}</Button>
        </>
      )}
    </div>
  );
}

export function InterpreterAssign({ apptId, options }: { apptId: string; options: { id: string; label: string }[] }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [choice, setChoice] = useState(options[0]?.id ?? "");
  const [link, setLink] = useState<{ url: string; name: string } | null>(null);
  if (link)
    return (
      <div className="space-y-2">
        <Alert tone="success">{t("{name} is assigned. Send them this one-time join link:", { name: link.name })}</Alert>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-2 px-2 py-1 text-sm">{link.url}</code>
          <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(link.url)} aria-label={t("Copy link")}><Copy className="size-4" aria-hidden /></Button>
        </div>
      </div>
    );
  if (!options.length) return <p className="text-sm text-warning">{t("No interpreter for this language. Try the partner agency.")}</p>;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="sr-only" htmlFor={`i-${apptId}`}>{t("Interpreter")}</label>
      <Select id={`i-${apptId}`} value={choice} onChange={(e) => setChoice(e.target.value)} className="w-auto">
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </Select>
      <Button size="sm" disabled={pending || !choice} onClick={() => start(async () => setLink(await assignInterpreterAction(apptId, choice)))}>{t("Assign")}</Button>
    </div>
  );
}

export function AssistedBookingForm({ hidden, slots, languages }: { hidden: Record<string, string>; slots: { id: string; label: string; day: string }[]; languages: { code: string; name: string }[] }) {
  const { t } = useI18n();
  const [state, action] = useActionState(assistedBookingAction, {} as AssistState);
  if (state.ok)
    return (
      <Alert tone="success" title={t("Booking {ref} reserved", { ref: state.ref ?? "" })}>
        {t("We sent the patient a payment link by SMS, WhatsApp and in the app. The slot is held for 15 minutes — stay on the call until they pay.")}{" "}
        <Link href="/coordinator/book" className="font-semibold underline">{t("Book another")}</Link>
      </Alert>
    );
  const days = [...new Set(slots.map((s) => s.day))];
  return (
    <form action={action} className="space-y-4">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <fieldset className="space-y-3">
        <legend className="font-semibold">{t("Choose a time")}</legend>
        {days.length ? days.map((d) => (
          <div key={d} className="space-y-1">
            <p className="text-sm font-semibold text-fg-muted">{d}</p>
            <div className="flex flex-wrap gap-2">
              {slots.filter((s) => s.day === d).map((s) => (
                <label key={s.id} className="tap flex cursor-pointer items-center gap-2 rounded-xl border border-field px-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                  <input type="radio" name="slotId" value={s.id} required className="size-4 accent-[var(--primary)]" />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
        )) : <p className="text-fg-muted">{t("No free slots in the next 7 days.")}</p>}
      </fieldset>
      <div className="max-w-xs">
        <label htmlFor="interp" className="mb-1 block font-medium">{t("Interpreter needed")}</label>
        <Select id="interp" name="interpreterLanguage" defaultValue="">
          <option value="">{t("No")}</option>
          {languages.map((l) => <option key={l.code} value={l.code}>{t(l.name)}</option>)}
        </Select>
      </div>
      <Checkbox name="agreed" required label={t("The patient (or their family member with permission) asked me to book this on the call, and agreed to the telemedicine consent.")} />
      <SubmitButton>{t("Reserve and send payment link")}</SubmitButton>
    </form>
  );
}
