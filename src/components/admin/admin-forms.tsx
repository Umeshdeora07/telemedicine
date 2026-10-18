"use client";

import { useActionState, useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";
import {
  complaintAction,
  countryAction,
  couponAction,
  dataRequestAction,
  decideClinicAction,
  decideDoctorAction,
  emergencyAction,
  incidentAction,
  incidentStepAction,
  policyAction,
  publishArticleAction,
  saveArticleAction,
  rateAction,
  refundAction,
  setUserStatusAction,
  toggleCouponAction,
  verifyLicenceAction,
  type AdminState,
} from "@/server/actions/admin";
import { createResetLinkAction } from "@/server/actions/password";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

function Msg({ s, ok }: { s: AdminState; ok: string }) {
  if (s.error) return <Alert tone="danger">{s.error}</Alert>;
  if (s.ok) return <Alert tone="success">{ok}</Alert>;
  return null;
}

export function LicenceVerifyForm({ doctorId, licenceId, current }: { doctorId: string; licenceId: string; current: string }) {
  const { t } = useI18n();
  const [s, action] = useActionState(verifyLicenceAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
      <input type="hidden" name="doctorId" value={doctorId} />
      <input type="hidden" name="licenceId" value={licenceId} />
      <div className="sm:col-span-3"><Msg s={s} ok={t("Licence updated.")} /></div>
      <Field label={t("Result")} htmlFor={`st-${licenceId}`}>
        <Select id={`st-${licenceId}`} name="status" defaultValue={current === "pending" ? "verified" : current}>
          <option value="verified">{t("Verified")}</option>
          <option value="rejected">{t("Rejected")}</option>
          <option value="suspended">{t("Suspended")}</option>
        </Select>
      </Field>
      <Field label={t("Register reference you checked")} htmlFor={`ref-${licenceId}`} hint={t("For example the NMC Indian Medical Register search ID, or the state board's licence lookup URL.")}>
        <Input id={`ref-${licenceId}`} name="reference" required minLength={3} />
      </Field>
      <SubmitButton variant="secondary">{t("Save")}</SubmitButton>
      <Field label={t("Notes (shown to the doctor if rejected)")} htmlFor={`n-${licenceId}`} className="sm:col-span-3">
        <Input id={`n-${licenceId}`} name="notes" />
      </Field>
    </form>
  );
}

export function DoctorDecisionForm({ doctorId, status }: { doctorId: string; status: string }) {
  const { t } = useI18n();
  const [s, action] = useActionState(decideDoctorAction, {});
  const options = status === "approved" ? ["suspend"] : status === "suspended" ? ["reinstate", "reject"] : ["approve", "reject"];
  const label: Record<string, string> = { approve: t("Approve and make the doctor live"), reject: t("Send back for changes"), suspend: t("Suspend (hide from patients)"), reinstate: t("Reinstate") };
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="doctorId" value={doctorId} />
      <Msg s={s} ok={t("Decision saved and the doctor was notified.")} />
      <fieldset className="space-y-2">
        <legend className="font-semibold">{t("Decision")}</legend>
        {options.map((o, i) => (
          <label key={o} className="flex min-h-11 items-center gap-2"><input type="radio" name="decision" value={o} defaultChecked={i === 0} className="size-5 accent-[var(--primary)]" />{label[o]}</label>
        ))}
      </fieldset>
      <Field label={t("Reason (required unless approving)")} htmlFor="reason"><Textarea id="reason" name="reason" rows={2} /></Field>
      <SubmitButton>{t("Save decision")}</SubmitButton>
    </form>
  );
}

export function ClinicDecision({ id, status }: { id: string; status: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  if (status === "approved") return null;
  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => start(async () => void (await decideClinicAction(id, true)))}>{t("Approve")}</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => void (await decideClinicAction(id, false)))}>{t("Reject")}</Button>
    </div>
  );
}

export function UserStatusButton({ id, status }: { id: string; status: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const next = status === "active" ? "suspended" : "active";
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button size="sm" variant={next === "suspended" ? "ghost" : "secondary"} disabled={pending} onClick={() => start(async () => { const r = await setUserStatusAction(id, next); setErr(r.error ?? null); })}>
        {next === "suspended" ? t("Suspend") : t("Reactivate")}
      </Button>
      {err ? <span role="alert" className="text-sm text-danger">{err}</span> : null}
    </span>
  );
}

/**
 * Admin: a link to send a new doctor. It opens the doctor sign up with their
 * name and specialty filled in; the doctor then adds their own documents and
 * the admin verifies them as usual.
 */
export function DoctorJoinLink({ baseUrl, specialties }: { baseUrl: string; specialties: { slug: string; name: string }[] }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [copied, setCopied] = useState(false);
  const query = new URLSearchParams({ ...(name.trim() ? { name: name.trim() } : {}), ...(specialty ? { specialty } : {}) }).toString();
  const url = `${baseUrl}/for-doctors/apply${query ? `?${query}` : ""}`;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Doctor's full name")} htmlFor="join-name" optional={t("optional")}>
          <Input id="join-name" value={name} onChange={(e) => { setName(e.target.value); setCopied(false); }} placeholder={t("Dr. Asha Menon")} />
        </Field>
        <Field label={t("Specialty")} htmlFor="join-spec" optional={t("optional")}>
          <Select id="join-spec" value={specialty} onChange={(e) => { setSpecialty(e.target.value); setCopied(false); }}>
            <option value="">{t("The doctor chooses")}</option>
            {specialties.map((s) => (
              <option key={s.slug} value={s.slug}>{t(s.name)}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input readOnly value={url} aria-label={t("Link for the doctor")} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-sm" />
        <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(url).then(() => setCopied(true), () => setCopied(false))}>
          {copied ? t("Copied") : t("Copy link")}
        </Button>
      </div>
    </div>
  );
}

/** Makes a one time link for someone to choose a new password; the admin sends it to them. */
export function ResetLinkButton({ id }: { id: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ url?: string; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  if (res?.url) {
    return (
      <span className="flex max-w-xs flex-col items-end gap-1 text-start">
        <span className="text-sm text-fg-muted">{t("Send this link to the person yourself, for example by WhatsApp. It works once, for 24 hours.")}</span>
        <input readOnly value={res.url} aria-label={t("Password reset link")} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-lg border border-line bg-surface-2 px-2 py-1 font-mono text-xs" />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => navigator.clipboard?.writeText(res.url!).then(() => setCopied(true), () => setCopied(false))}
        >
          {copied ? t("Copied") : t("Copy link")}
        </Button>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => setRes(await createResetLinkAction(id)))}>
        {t("Password reset link")}
      </Button>
      {res?.error ? <span role="alert" className="text-sm text-danger">{res.error}</span> : null}
    </span>
  );
}

export function RefundForm({ paymentId, left, currency }: { paymentId: string; left: string; currency: string }) {
  const { t } = useI18n();
  const [s, action] = useActionState(refundAction, {});
  const [open, setOpen] = useState(false);
  if (!open) return <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>{t("Refund")}</Button>;
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
      <input type="hidden" name="paymentId" value={paymentId} />
      <div className="sm:col-span-3"><Msg s={s} ok={t("Refund issued. The patient gets it in 5 to 7 working days.")} /></div>
      <Field label={t("Amount ({cur})", { cur: currency })} htmlFor={`a-${paymentId}`} hint={t("Up to {left}", { left })}><Input id={`a-${paymentId}`} name="amount" inputMode="decimal" required /></Field>
      <Field label={t("Reason")} htmlFor={`r-${paymentId}`}><Input id={`r-${paymentId}`} name="reason" required minLength={5} /></Field>
      <SubmitButton size="sm">{t("Issue refund")}</SubmitButton>
    </form>
  );
}

export function ComplaintForm({ id, status }: { id: string; status: string }) {
  const { t } = useI18n();
  const [s, action] = useActionState(complaintAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={id} />
      <div className="sm:col-span-2"><Msg s={s} ok={t("Update saved.")} /></div>
      <Field label={t("Status")} htmlFor={`cs-${id}`}>
        <Select id={`cs-${id}`} name="status" defaultValue={status === "open" ? "acknowledged" : status}>
          <option value="acknowledged">{t("Acknowledged")}</option>
          <option value="in_progress">{t("In progress")}</option>
          <option value="resolved">{t("Resolved")}</option>
          <option value="closed">{t("Closed")}</option>
        </Select>
      </Field>
      <Field label={t("Resolution summary (when resolving)")} htmlFor={`res-${id}`}><Input id={`res-${id}`} name="resolution" /></Field>
      <Field label={t("Update note")} htmlFor={`cn-${id}`} className="sm:col-span-2"><Textarea id={`cn-${id}`} name="note" rows={2} required /></Field>
      <Checkbox name="public" defaultChecked label={t("Send this update to the person who complained")} className="sm:col-span-2" />
      <div className="sm:col-span-2"><SubmitButton variant="secondary" size="sm">{t("Save update")}</SubmitButton></div>
    </form>
  );
}

export function CountryToggles({ code, enabled }: { code: string; enabled: boolean }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <span className="flex flex-wrap gap-3">
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" defaultChecked={enabled} disabled={pending} onChange={(e) => start(async () => void (await countryAction(code, { enabled: e.target.checked })))} className="size-5 accent-[var(--primary)]" />{t("Sign-ups open")}</label>
    </span>
  );
}

export function EmergencyForm({ code, e }: { code: string; e: { general: string; ambulance?: string; police?: string; crisisLine?: string; crisisLineName?: string } }) {
  const { t } = useI18n();
  const [s, action] = useActionState(emergencyAction, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-5 sm:items-end">
      <input type="hidden" name="code" value={code} />
      <div className="sm:col-span-5"><Msg s={s} ok={t("Saved.")} /></div>
      <Field label={t("Emergency")} htmlFor={`g-${code}`}><Input id={`g-${code}`} name="general" defaultValue={e.general} inputMode="tel" /></Field>
      <Field label={t("Ambulance")} htmlFor={`am-${code}`}><Input id={`am-${code}`} name="ambulance" defaultValue={e.ambulance} inputMode="tel" /></Field>
      <Field label={t("Police")} htmlFor={`po-${code}`}><Input id={`po-${code}`} name="police" defaultValue={e.police} inputMode="tel" /></Field>
      <Field label={t("Crisis line")} htmlFor={`cl-${code}`}><Input id={`cl-${code}`} name="crisisLine" defaultValue={e.crisisLine} inputMode="tel" /></Field>
      <SubmitButton size="sm" variant="secondary">{t("Save")}</SubmitButton>
      <input type="hidden" name="crisisLineName" value={e.crisisLineName ?? ""} />
    </form>
  );
}

export function RateForm({ currencies }: { currencies: string[] }) {
  const { t } = useI18n();
  const [s, action] = useActionState(rateAction, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[8rem_10rem_auto] sm:items-end">
      <div className="sm:col-span-3"><Msg s={s} ok={t("Rate saved. New prices use it right away; booked prices don't change.")} /></div>
      <Field label={t("Currency")} htmlFor="quote"><Select id="quote" name="quote">{currencies.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      <Field label={t("1 INR =")} htmlFor="rate"><Input id="rate" name="rate" inputMode="decimal" required /></Field>
      <SubmitButton size="sm" variant="secondary">{t("Add today's rate")}</SubmitButton>
    </form>
  );
}

export function PolicyForm({ p }: { p: { doctorNoShowMinutes: number; patientCancelFullRefundHours: number; patientCancelPartialRefundPercent: number; rescheduleFreeHours: number } }) {
  const { t } = useI18n();
  const [s, action] = useActionState(policyAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <div className="sm:col-span-4"><Msg s={s} ok={t("Policy saved. It applies to new bookings.")} /></div>
      <Field label={t("Doctor no-show after (min)")} htmlFor="dns"><Input id="dns" name="doctorNoShowMinutes" type="number" defaultValue={p.doctorNoShowMinutes} /></Field>
      <Field label={t("Full refund if cancelled (hours before)")} htmlFor="fr"><Input id="fr" name="patientCancelFullRefundHours" type="number" defaultValue={p.patientCancelFullRefundHours} /></Field>
      <Field label={t("Late cancel refund (%)")} htmlFor="pr"><Input id="pr" name="patientCancelPartialRefundPercent" type="number" defaultValue={p.patientCancelPartialRefundPercent} /></Field>
      <Field label={t("Patients can change the time until (hours before)")} htmlFor="rs"><Input id="rs" name="rescheduleFreeHours" type="number" defaultValue={p.rescheduleFreeHours} /></Field>
      <div className="sm:col-span-4"><SubmitButton size="sm" variant="secondary">{t("Save policy")}</SubmitButton></div>
    </form>
  );
}

export function CouponForm() {
  const { t } = useI18n();
  const [s, action] = useActionState(couponAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <div className="sm:col-span-4"><Msg s={s} ok={t("Coupon created.")} /></div>
      <Field label={t("Code")} htmlFor="code"><Input id="code" name="code" required className="uppercase" /></Field>
      <Field label={t("Type")} htmlFor="kind"><Select id="kind" name="kind"><option value="percent">{t("Percent off")}</option><option value="flat">{t("Flat ₹ off")}</option></Select></Field>
      <Field label={t("Value")} htmlFor="value"><Input id="value" name="value" inputMode="decimal" required /></Field>
      <Field label={t("Max discount (₹)")} htmlFor="maxDiscount"><Input id="maxDiscount" name="maxDiscount" inputMode="decimal" /></Field>
      <Field label={t("Description")} htmlFor="description" className="sm:col-span-2"><Input id="description" name="description" /></Field>
      <Field label={t("Max uses")} htmlFor="maxUses"><Input id="maxUses" name="maxUses" type="number" /></Field>
      <Field label={t("Valid until")} htmlFor="validUntil"><Input id="validUntil" name="validUntil" type="date" /></Field>
      <Checkbox name="firstConsultOnly" label={t("First consult only")} className="sm:col-span-4" />
      <div className="sm:col-span-4"><SubmitButton size="sm" variant="secondary">{t("Create coupon")}</SubmitButton></div>
    </form>
  );
}

export function CouponToggle({ id, active }: { id: string; active: boolean }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => void (await toggleCouponAction(id, !active)))}>{active ? t("Turn off") : t("Turn on")}</Button>;
}

export function DataRequestControls({ id }: { id: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="sr-only" htmlFor={`dr-${id}`}>{t("Note")}</label>
      <Input id={`dr-${id}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("What was done")} className="w-56" />
      <Button size="sm" disabled={pending || !note.trim()} onClick={() => start(async () => void (await dataRequestAction(id, "completed", note)))}>{t("Mark completed")}</Button>
      <Button size="sm" variant="ghost" disabled={pending || !note.trim()} onClick={() => start(async () => void (await dataRequestAction(id, "rejected", note)))}>{t("Reject")}</Button>
    </div>
  );
}

export function IncidentForm() {
  const { t } = useI18n();
  const [s, action] = useActionState(incidentAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-3"><Msg s={s} ok={t("Incident logged. Report it to CERT-In within 6 hours and to the Data Protection Board as required.")} /></div>
      <Field label={t("Title")} htmlFor="it" className="sm:col-span-2"><Input id="it" name="title" required /></Field>
      <Field label={t("Severity")} htmlFor="isv"><Select id="isv" name="severity"><option value="low">{t("Low")}</option><option value="medium">{t("Medium")}</option><option value="high">{t("High")}</option><option value="critical">{t("Critical")}</option></Select></Field>
      <Field label={t("What happened")} htmlFor="id" className="sm:col-span-2"><Textarea id="id" name="description" rows={2} required /></Field>
      <Field label={t("People affected (estimate)")} htmlFor="ia"><Input id="ia" name="affectedUsers" type="number" defaultValue={0} /></Field>
      <div className="sm:col-span-3"><SubmitButton size="sm" variant="danger">{t("Log incident")}</SubmitButton></div>
    </form>
  );
}

export function IncidentStep({ id, field, label }: { id: string; field: "containedAt" | "reportedToBoardAt" | "usersNotifiedAt" | "closed"; label: string }) {
  const [pending, start] = useTransition();
  return <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => void (await incidentStepAction(id, field)))}>{label}</Button>;
}

export function ArticleForm({ doctors, categories }: { doctors: { id: string; name: string }[]; categories: string[] }) {
  const { t } = useI18n();
  const [s, action] = useActionState(saveArticleAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-3"><Msg s={s} ok={t("Article saved.")} /></div>
      <Field label={t("Title")} htmlFor="at" className="sm:col-span-2"><Input id="at" name="title" required /></Field>
      <Field label={t("Category")} htmlFor="ac"><Select id="ac" name="category">{categories.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      <Field label={t("Summary (1 or 2 sentences)")} htmlFor="as" className="sm:col-span-3"><Input id="as" name="summary" required /></Field>
      <Field label={t("Body (Markdown, plain language, reading age 12)")} htmlFor="ab" className="sm:col-span-3"><Textarea id="ab" name="body" rows={10} required /></Field>
      <Field label={t("Reviewed by doctor")} htmlFor="ar"><Select id="ar" name="reviewer" defaultValue=""><option value="">{t("Not reviewed yet")}</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
      <Field label={t("Language")} htmlFor="al"><Select id="al" name="language" defaultValue="en"><option value="en">English</option><option value="hi">हिन्दी</option></Select></Field>
      <Checkbox name="publish" label={t("Publish now")} hint={t("Needs a reviewing doctor.")} />
      <div className="sm:col-span-3"><SubmitButton>{t("Save article")}</SubmitButton></div>
    </form>
  );
}

export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button size="sm" variant={published ? "ghost" : "secondary"} disabled={pending} onClick={() => start(async () => { const r = await publishArticleAction(id, !published); setErr(r.error ?? null); })}>{published ? t("Unpublish") : t("Publish")}</Button>
      {err ? <span role="alert" className="max-w-56 text-end text-sm text-danger">{err}</span> : null}
    </span>
  );
}
