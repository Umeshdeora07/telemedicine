"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { addFamilyAction, confirmFamilyAction, familyPermsAction, resendFamilyCodeAction, type PState } from "@/server/actions/patient-app";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const RELS = ["Mother", "Father", "Spouse", "Son", "Daughter", "Grandmother", "Grandfather", "Sibling", "Other"];

export function AddFamilyForm({ countries, defaultCountry, pendingLinkId }: { countries: { code: string; name: string }[]; defaultCountry: string; pendingLinkId?: string }) {
  const { t } = useI18n();
  const [s, action] = useActionState(addFamilyAction, (pendingLinkId ? { linkId: pendingLinkId } : {}) as PState);
  const [dob, setDob] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const onDob = (v: string) => {
    setDob(v);
    setAge(v ? Math.floor((Date.now() - new Date(v).getTime()) / (365.25 * 86400_000)) : null);
  };
  if (s.linkId) return <ConsentStep linkId={s.linkId} devCode={s.devCode} note={s.message} />;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {s.error ? <Alert tone="danger" className="sm:col-span-2">{s.error}</Alert> : null}
      <Field label={t("Full name")} htmlFor="fullName" required className="sm:col-span-2"><Input id="fullName" name="fullName" autoComplete="off" /></Field>
      <Field label={t("Relationship to you")} htmlFor="relationship" required>
        <Select id="relationship" name="relationship">{RELS.map((r) => <option key={r} value={r}>{t(r)}</option>)}</Select>
      </Field>
      <Field label={t("Date of birth")} htmlFor="dob" required><Input id="dob" name="dob" type="date" value={dob} onChange={(e) => onDob(e.target.value)} /></Field>
      <Field label={t("Sex")} htmlFor="sex" required>
        <Select id="sex" name="sex"><option value="female">{t("Female")}</option><option value="male">{t("Male")}</option><option value="other">{t("Other")}</option></Select>
      </Field>
      <Field label={t("Lives in")} htmlFor="country" required>
        <Select id="country" name="country" defaultValue={defaultCountry}>{countries.map((c) => <option key={c.code} value={c.code}>{t(c.name)}</option>)}</Select>
      </Field>
      {age !== null && age < 18 ? (
        <Checkbox name="guardian" required className="sm:col-span-2" label={t("I am this child's parent or legal guardian")} hint={t("A parent or guardian must always be present at a child's consultation.")} />
      ) : (
        <Field label={t("Their mobile number (with country code)")} htmlFor="phone" required className="sm:col-span-2" hint={t("We text them a code. They read it to you if they agree to let you book and see their consultations. India's data protection law requires this, and it is the right thing to do.")}>
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="off" placeholder="+91 98xxxxxxxx" />
        </Field>
      )}
      <div className="sm:col-span-2"><SubmitButton>{age !== null && age < 18 ? t("Add child") : t("Send consent code")}</SubmitButton></div>
    </form>
  );
}

function ConsentStep({ linkId, devCode, note }: { linkId: string; devCode?: string; note?: string }) {
  const { t } = useI18n();
  const [s, action] = useActionState(confirmFamilyAction, { linkId } as PState);
  const [resend, setResend] = useState<PState | null>(null);
  const [pending, start] = useTransition();
  const code = resend?.devCode ?? devCode;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="linkId" value={linkId} />
      <Alert tone="info" title={t("We sent them a code")}>{t("Ask your family member to read you the 6 digit code from the text message. They should only share it if they agree.")}</Alert>
      {note ? <Alert tone="warning">{note}</Alert> : null}
      {code ? <p className="text-sm text-fg-muted">{t("Text messages are not connected yet, so here is the code: {code}", { code })}</p> : null}
      {s.error ? <Alert tone="danger">{s.error}</Alert> : null}
      {resend?.error ? <Alert tone="danger">{resend.error}</Alert> : null}
      <Field label={t("Code")} htmlFor="code"><Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="max-w-40 font-mono text-2xl tracking-[0.3em]" /></Field>
      <div className="flex flex-wrap gap-2">
        <SubmitButton>{t("Confirm")}</SubmitButton>
        <Button variant="ghost" disabled={pending} onClick={() => start(async () => setResend(await resendFamilyCodeAction(linkId)))}>{t("Send a new code")}</Button>
      </div>
    </form>
  );
}

export function PermissionToggles({ linkId, perms, mine }: { linkId: string; perms: { canBook: boolean; canJoin: boolean; canViewRecords: boolean; receivesNotifications: boolean }; mine: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, setState] = useState(perms);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof perms, v: boolean) => {
    const next = { ...state, [k]: v };
    setState(next);
    start(async () => { await familyPermsAction(linkId, next); router.refresh(); });
  };
  const labels: Record<keyof typeof perms, string> = mine
    ? { canBook: t("Book consultations"), canJoin: t("Join video calls"), canViewRecords: t("See records and prescriptions"), receivesNotifications: t("Get reminders") }
    : { canBook: t("They can book for me"), canJoin: t("They can join my calls"), canViewRecords: t("They can see my records"), receivesNotifications: t("They get my reminders") };
  return (
    <fieldset className="grid gap-1 sm:grid-cols-2" disabled={pending}>
      <legend className="sr-only">{t("Permissions")}</legend>
      {(Object.keys(labels) as (keyof typeof perms)[]).map((k) => (
        <label key={k} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={state[k]} onChange={(e) => set(k, e.target.checked)} className="size-5 accent-[var(--primary)]" />{labels[k]}</label>
      ))}
    </fieldset>
  );
}
