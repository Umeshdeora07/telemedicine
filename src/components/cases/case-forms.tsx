"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { assignCaseAction, caseMessageAction, caseStatusAction, issueVisaLetterAction, respondEstimateAction, sendEstimateAction, travelAction, payCaseDepositAction, type CaseFormState } from "@/server/actions/cases";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

function Result({ state, ok }: { state: CaseFormState; ok: string }) {
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state.ok) return <Alert tone="success">{ok}</Alert>;
  return null;
}

export function AssignForm({ caseId, clinics, doctors, clinicId, doctorId }: { caseId: string; clinics: { id: string; name: string }[]; doctors: { id: string; name: string }[]; clinicId: string | null; doctorId: string | null }) {
  const { t } = useI18n();
  const [state, action] = useActionState(assignCaseAction, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="caseId" value={caseId} />
      <div className="sm:col-span-2"><Result state={state} ok={t("Saved. The case is now with the specialist.")} /></div>
      <Field label={t("Hospital")} htmlFor="clinicId">
        <Select id="clinicId" name="clinicId" defaultValue={clinicId ?? ""}>
          <option value="">{t("Choose…")}</option>
          {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label={t("Reviewing doctor")} htmlFor="doctorId">
        <Select id="doctorId" name="doctorId" defaultValue={doctorId ?? ""}>
          <option value="">{t("Choose…")}</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </Field>
      <Field label={t("Note for the patient")} htmlFor="assign-note" className="sm:col-span-2">
        <Input id="assign-note" name="note" placeholder={t("Reports complete. Sent to the specialist for review.")} />
      </Field>
      <div className="sm:col-span-2"><SubmitButton variant="secondary">{t("Assign")}</SubmitButton></div>
    </form>
  );
}

export function EstimateForm({ caseId, currency, rate, doctorId, treatment }: { caseId: string; currency: string; rate: number; doctorId: string | null; treatment: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(sendEstimateAction, {});
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const conv = (v: string) => (Number(v) > 0 && currency !== "INR" ? `≈ ${currency} ${Math.round(Number(v) * rate).toLocaleString()}` : "");
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="doctorId" value={doctorId ?? ""} />
      <div className="sm:col-span-2"><Result state={state} ok={t("Plan and estimate sent to the patient.")} /></div>
      <Field label={t("Recommended treatment")} htmlFor="recommendedTreatment" required className="sm:col-span-2">
        <Input id="recommendedTreatment" name="recommendedTreatment" defaultValue={treatment} />
      </Field>
      <Field label={t("Why (in plain words)")} htmlFor="rationale" className="sm:col-span-2">
        <Textarea id="rationale" name="rationale" rows={3} />
      </Field>
      <Field label={t("Days in hospital")} htmlFor="hospitalDays" required><Input id="hospitalDays" name="hospitalDays" type="number" min={0} inputMode="numeric" /></Field>
      <Field label={t("Total days in India")} htmlFor="indiaDays" required><Input id="indiaDays" name="indiaDays" type="number" min={1} inputMode="numeric" /></Field>
      <Field label={t("Cost from (₹)")} htmlFor="costMinInr" required hint={conv(min)}><Input id="costMinInr" name="costMinInr" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d]/g, ""))} /></Field>
      <Field label={t("Cost up to (₹)")} htmlFor="costMaxInr" required hint={conv(max)}><Input id="costMaxInr" name="costMaxInr" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d]/g, ""))} /></Field>
      <Field label={t("Deposit to confirm (₹)")} htmlFor="depositInr"><Input id="depositInr" name="depositInr" inputMode="numeric" defaultValue="0" /></Field>
      <Field label={t("Valid for (days)")} htmlFor="validDays"><Input id="validDays" name="validDays" type="number" min={7} max={180} defaultValue={30} /></Field>
      <Field label={t("Included (one per line)")} htmlFor="inclusions"><Textarea id="inclusions" name="inclusions" rows={4} placeholder={t("Surgeon and anaesthesia fees\nRoom for patient and 1 attendant\nImplant")} /></Field>
      <Field label={t("Not included (one per line)")} htmlFor="exclusions"><Textarea id="exclusions" name="exclusions" rows={4} placeholder={t("Flights and visa fees\nHotel stay after discharge")} /></Field>
      <Field label={t("Documents to bring (one per line)")} htmlFor="documentsNeeded" className="sm:col-span-2"><Textarea id="documentsNeeded" name="documentsNeeded" rows={3} /></Field>
      <p className="text-sm text-fg-muted sm:col-span-2">{t("The patient sees the range in {cur} at today's exchange rate, with the rate and date shown. Final bills are in rupees.", { cur: currency })}</p>
      <div className="sm:col-span-2"><SubmitButton>{t("Send plan and estimate")}</SubmitButton></div>
    </form>
  );
}

export function VisaLetterForm({ caseId, nationality, treatment, attendants }: { caseId: string; nationality: string; treatment: string; attendants: { name: string; relationship: string }[] }) {
  const { t } = useI18n();
  const [state, action] = useActionState(issueVisaLetterAction, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="caseId" value={caseId} />
      <div className="sm:col-span-2"><Result state={state} ok={t("Visa letter issued. The patient can download it from their case.")} /></div>
      <Field label={t("Patient's passport number")} htmlFor="passportNumber" required><Input id="passportNumber" name="passportNumber" autoComplete="off" className="uppercase" /></Field>
      <Field label={t("Nationality")} htmlFor="nationality" required><Input id="nationality" name="nationality" defaultValue={nationality} /></Field>
      <Field label={t("Treatment")} htmlFor="treatment" required className="sm:col-span-2"><Input id="treatment" name="treatment" defaultValue={treatment} /></Field>
      <Field label={t("Expected admission")} htmlFor="expectedAdmission"><Input id="expectedAdmission" name="expectedAdmission" type="date" /></Field>
      <Field label={t("Expected days in India")} htmlFor="expectedDays"><Input id="expectedDays" name="expectedDays" type="number" min={1} /></Field>
      {[0, 1].map((i) => (
        <fieldset key={i} className="grid gap-3 rounded-xl border border-line p-3 sm:col-span-2 sm:grid-cols-4">
          <legend className="px-1 font-semibold">{t("Attendant {n} (optional)", { n: i + 1 })}</legend>
          <Field label={t("Name")} htmlFor={`att${i}Name`}><Input id={`att${i}Name`} name={`att${i}Name`} defaultValue={attendants[i]?.name ?? ""} /></Field>
          <Field label={t("Relationship")} htmlFor={`att${i}Rel`}><Input id={`att${i}Rel`} name={`att${i}Rel`} defaultValue={attendants[i]?.relationship ?? ""} /></Field>
          <Field label={t("Passport")} htmlFor={`att${i}Passport`}><Input id={`att${i}Passport`} name={`att${i}Passport`} autoComplete="off" className="uppercase" /></Field>
          <Field label={t("Nationality")} htmlFor={`att${i}Nationality`}><Input id={`att${i}Nationality`} name={`att${i}Nationality`} defaultValue={nationality} /></Field>
        </fieldset>
      ))}
      <p className="text-sm text-fg-muted sm:col-span-2">{t("Passport numbers are stored encrypted and shown masked everywhere except the letter itself. India allows up to 2 attendants on e-Medical Attendant visas.")}</p>
      <div className="sm:col-span-2"><SubmitButton>{t("Issue visa letter")}</SubmitButton></div>
    </form>
  );
}

export function StatusForm({ caseId, options }: { caseId: string; options: { value: string; label: string }[] }) {
  const { t } = useI18n();
  const [state, action] = useActionState(caseStatusAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="caseId" value={caseId} />
      <div className="sm:col-span-2"><Result state={state} ok={t("Update added.")} /></div>
      <Field label={t("Move to step")} htmlFor="status">
        <Select id="status" name="status" defaultValue="">
          <option value="">{t("No change (add a note only)")}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Field>
      <Field label={t("Note")} htmlFor="status-note" required className="sm:col-span-2">
        <Textarea id="status-note" name="note" rows={2} required />
      </Field>
      <Checkbox name="visibleToPatient" defaultChecked label={t("Show this update to the patient")} className="sm:col-span-2" />
      <div className="sm:col-span-2"><SubmitButton variant="secondary">{t("Add update")}</SubmitButton></div>
    </form>
  );
}

export type CaseMsg = { id: number; senderName: string; senderRole: string; body: string; createdAt: string; mine: boolean };

export function CaseChat({ caseId, messages }: { caseId: string; messages: CaseMsg[] }) {
  const { t, intl } = useI18n();
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const end = useRef<HTMLLIElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);
  return (
    <div className="card flex h-[28rem] flex-col overflow-hidden">
      <ul className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
        {messages.length ? null : <li className="text-center text-fg-muted">{t("No messages yet. Ask anything about your treatment, costs or travel.")}</li>}
        {messages.map((m) => (
          <li key={m.id} className={cn("max-w-[85%] rounded-2xl px-3 py-2", m.mine ? "ms-auto bg-primary text-on-primary" : "bg-surface-2")}>
            <p className={cn("text-xs font-semibold", m.mine ? "opacity-90" : "text-fg-muted")}>{m.senderName} · {new Date(m.createdAt).toLocaleString(intl, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
            <p className="whitespace-pre-line">{m.body}</p>
          </li>
        ))}
        <li ref={end} aria-hidden />
      </ul>
      <form
        className="flex items-end gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          start(async () => {
            const r = await caseMessageAction(caseId, text);
            if (r.error) setError(r.error);
            else {
              setText("");
              setError(null);
              router.refresh();
            }
          });
        }}
      >
        <label htmlFor={`case-msg-${caseId}`} className="sr-only">{t("Message")}</label>
        <Textarea id={`case-msg-${caseId}`} value={text} onChange={(e) => setText(e.target.value)} rows={2} className="min-h-11 flex-1" placeholder={t("Write a message…")} />
        <Button type="submit" disabled={pending || !text.trim()} aria-label={t("Send")}><Send className="size-5" aria-hidden /></Button>
      </form>
      {error ? <p role="alert" className="px-3 pb-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function EstimateResponse({ estimateId, caseId }: { estimateId: string; caseId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const go = (accept: boolean) =>
    start(async () => {
      const r = await respondEstimateAction(estimateId, caseId, accept);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Button size="lg" disabled={pending} onClick={() => go(true)}>{t("Accept this plan")}</Button>
        {confirmDecline ? (
          <Button variant="danger" disabled={pending} onClick={() => go(false)}>{t("Yes, decline")}</Button>
        ) : (
          <Button variant="ghost" disabled={pending} onClick={() => setConfirmDecline(true)}>{t("Decline")}</Button>
        )}
      </div>
      <p className="text-sm text-fg-muted">{t("Accepting doesn't charge you. The hospital then issues your visa letter, and you pay the deposit when you're ready.")}</p>
    </div>
  );
}

export function PayDeposit({ caseId, label }: { caseId: string; label: string }) {
  const [pending, start] = useTransition();
  return <Button size="lg" disabled={pending} onClick={() => start(async () => void (await payCaseDepositAction(caseId)))}>{label}</Button>;
}

export function TravelForm({ caseId, travel, languages }: { caseId: string; travel: { arrivalDate?: string; departureDate?: string; airportPickup?: { requested: boolean; flight?: string }; stay?: { option?: string }; localSim?: boolean; interpreterLanguage?: string; foodPreferences?: string; notes?: string }; languages: { code: string; name: string }[] }) {
  const { t } = useI18n();
  const [state, action] = useActionState(travelAction, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="caseId" value={caseId} />
      <div className="sm:col-span-2"><Result state={state} ok={t("Travel details saved. Your coordinator will confirm.")} /></div>
      <Field label={t("Arrival date")} htmlFor="arrivalDate"><Input id="arrivalDate" name="arrivalDate" type="date" defaultValue={travel.arrivalDate} /></Field>
      <Field label={t("Return date")} htmlFor="departureDate"><Input id="departureDate" name="departureDate" type="date" defaultValue={travel.departureDate} /></Field>
      <Checkbox name="pickup" defaultChecked={travel.airportPickup?.requested} label={t("I need airport pickup")} />
      <Field label={t("Flight number")} htmlFor="flight"><Input id="flight" name="flight" defaultValue={travel.airportPickup?.flight} /></Field>
      <Field label={t("Where to stay after discharge")} htmlFor="stay">
        <Select id="stay" name="stay" defaultValue={travel.stay?.option ?? ""}>
          <option value="">{t("Help me choose")}</option>
          <option value="hospital_guest_house">{t("Hospital guest house")}</option>
          <option value="partner_hotel">{t("Partner hotel near the hospital")}</option>
          <option value="service_apartment">{t("Service apartment (kitchen)")}</option>
          <option value="own">{t("My own arrangement")}</option>
        </Select>
      </Field>
      <Field label={t("Interpreter language")} htmlFor="interpreterLanguage">
        <Select id="interpreterLanguage" name="interpreterLanguage" defaultValue={travel.interpreterLanguage ?? ""}>
          <option value="">{t("Not needed")}</option>
          {languages.map((l) => <option key={l.code} value={l.code}>{t(l.name)}</option>)}
        </Select>
      </Field>
      <Checkbox name="localSim" defaultChecked={travel.localSim} label={t("Get me a local SIM card on arrival")} />
      <Field label={t("Food preferences")} htmlFor="food"><Input id="food" name="food" defaultValue={travel.foodPreferences} placeholder={t("Halal, vegetarian, diabetic…")} /></Field>
      <Field label={t("Anything else")} htmlFor="travel-notes" className="sm:col-span-2"><Textarea id="travel-notes" name="notes" rows={2} defaultValue={travel.notes} /></Field>
      <div className="sm:col-span-2"><SubmitButton variant="secondary">{t("Save travel details")}</SubmitButton></div>
    </form>
  );
}
