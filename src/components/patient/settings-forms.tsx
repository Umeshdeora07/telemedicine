"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { setCurrencyAction, setLocaleAction, setTimeZoneAction } from "@/server/actions/prefs";
import { consentAction, deleteAccountAction, healthProfileAction, type PState } from "@/server/actions/patient-app";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function RegionForm({ locale, locales, currency, currencies, tz, zones }: { locale: string; locales: { code: string; name: string }[]; currency: string; currencies: string[]; tz: string; zones: string[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>) => start(async () => { await fn(); router.refresh(); });
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label={t("Language")} htmlFor="set-lang">
        <Select id="set-lang" defaultValue={locale} disabled={pending} onChange={(e) => run(() => setLocaleAction(e.target.value))}>{locales.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</Select>
      </Field>
      <Field label={t("Currency for prices")} htmlFor="set-cur">
        <Select id="set-cur" defaultValue={currency} disabled={pending} onChange={(e) => run(() => setCurrencyAction(e.target.value))}>{currencies.map((c) => <option key={c}>{c}</option>)}</Select>
      </Field>
      <Field label={t("Time zone")} htmlFor="set-tz">
        <Select id="set-tz" defaultValue={tz} disabled={pending} onChange={(e) => run(() => setTimeZoneAction(e.target.value, { saveToProfile: true }))}>{[...new Set([tz, ...zones])].map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}</Select>
      </Field>
    </div>
  );
}

export function ConsentToggles({ items }: { items: { type: "whatsapp" | "marketing" | "research"; label: string; hint: string; granted: boolean }[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.type} className="flex items-start gap-3">
          <input id={`c-${i.type}`} type="checkbox" defaultChecked={i.granted} disabled={pending} onChange={(e) => start(async () => { await consentAction(i.type, e.target.checked); router.refresh(); })} className="mt-0.5 size-6 shrink-0 accent-[var(--primary)]" />
          <label htmlFor={`c-${i.type}`}><span className="block font-medium">{i.label}</span><span className="block text-sm text-fg-muted">{i.hint}</span></label>
        </li>
      ))}
      <li className="text-sm text-fg-muted">{t("You can change these any time. Withdrawing doesn't affect anything you agreed to before.")}</li>
    </ul>
  );
}

export function DeleteAccountForm() {
  const { t } = useI18n();
  const [s, action] = useActionState(deleteAccountAction, {} as PState);
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="tap font-semibold text-danger underline">{t("Delete my account")}</button>;
  return (
    <form action={action} className="space-y-3">
      {s.error ? <Alert tone="danger">{s.error}</Alert> : null}
      <Alert tone="warning" title={t("Before you go")}>{t("We'll erase your account and health records within 30 days. Records the law requires us to keep (prescriptions, consult notes, invoices) are kept, locked, for the legal period, then erased. Download your data first if you want a copy.")}</Alert>
      <Field label={t("Why are you leaving? (optional)")} htmlFor="reason"><Textarea id="reason" name="reason" rows={2} /></Field>
      <Field label={t("Type DELETE to confirm")} htmlFor="confirm"><Input id="confirm" name="confirm" autoComplete="off" className="max-w-48" /></Field>
      <SubmitButton variant="danger">{t("Delete my account")}</SubmitButton>
    </form>
  );
}

type HP = { patientId: string; bloodGroup: string | null; heightCm: number | null; weightKg: number | null; allergies: string[]; conditions: string[]; currentMedicines: string[]; emergencyContact: { name: string; phone: string; relationship?: string } | null; preferredLanguage: string | null; city: string | null };

export function HealthProfileForm({ p, languages }: { p: HP; languages: { code: string; name: string }[] }) {
  const { t } = useI18n();
  const [s, action] = useActionState(healthProfileAction, {} as PState);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      <input type="hidden" name="patientId" value={p.patientId} />
      {s.ok ? <Alert tone="success" className="sm:col-span-3">{t("Saved. Doctors will see this before your next consult.")}</Alert> : null}
      {s.error ? <Alert tone="danger" className="sm:col-span-3">{s.error}</Alert> : null}
      <Field label={t("Blood group")} htmlFor="bloodGroup">
        <Select id="bloodGroup" name="bloodGroup" defaultValue={p.bloodGroup ?? ""}><option value="">{t("Don't know")}</option>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => <option key={b}>{b}</option>)}</Select>
      </Field>
      <Field label={t("Height (cm)")} htmlFor="heightCm"><Input id="heightCm" name="heightCm" type="number" min={30} max={250} defaultValue={p.heightCm ?? ""} /></Field>
      <Field label={t("Weight (kg)")} htmlFor="weightKg"><Input id="weightKg" name="weightKg" type="number" step="0.1" min={1} max={300} defaultValue={p.weightKg ?? ""} /></Field>
      <Field label={t("Allergies (medicines, food)")} htmlFor="allergies" className="sm:col-span-3" hint={t("Separate with commas. Write “None” if none.")}><Input id="allergies" name="allergies" defaultValue={p.allergies.join(", ")} /></Field>
      <Field label={t("Long-term conditions")} htmlFor="conditions" className="sm:col-span-3"><Input id="conditions" name="conditions" defaultValue={p.conditions.join(", ")} placeholder={t("Diabetes, high blood pressure…")} /></Field>
      <Field label={t("Medicines taken regularly")} htmlFor="currentMedicines" className="sm:col-span-3"><Textarea id="currentMedicines" name="currentMedicines" rows={2} defaultValue={p.currentMedicines.join("; ")} /></Field>
      <Field label={t("Emergency contact name")} htmlFor="ecName"><Input id="ecName" name="ecName" defaultValue={p.emergencyContact?.name ?? ""} /></Field>
      <Field label={t("Their phone")} htmlFor="ecPhone"><Input id="ecPhone" name="ecPhone" type="tel" defaultValue={p.emergencyContact?.phone ?? ""} /></Field>
      <Field label={t("Relationship")} htmlFor="ecRel"><Input id="ecRel" name="ecRel" defaultValue={p.emergencyContact?.relationship ?? ""} /></Field>
      <Field label={t("Preferred language with doctors")} htmlFor="preferredLanguage">
        <Select id="preferredLanguage" name="preferredLanguage" defaultValue={p.preferredLanguage ?? ""}><option value="">{t("Any")}</option>{languages.map((l) => <option key={l.code} value={l.code}>{t(l.name)}</option>)}</Select>
      </Field>
      <Field label={t("City")} htmlFor="city"><Input id="city" name="city" defaultValue={p.city ?? ""} /></Field>
      <div className="sm:col-span-3"><SubmitButton>{t("Save health details")}</SubmitButton></div>
    </form>
  );
}
