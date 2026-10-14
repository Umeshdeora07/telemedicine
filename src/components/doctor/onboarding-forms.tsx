"use client";

import { useActionState, useEffect, useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { addLicenceAction, addQualificationAction, saveOnboardingAction, submitForVerificationAction, type FormState } from "@/server/actions/doctor";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FileUploader, type Uploaded } from "@/components/common/file-uploader";

type Country = { code: string; name: string; licenceScope: string; regions: { code: string; name: string }[] };

export function BasicsForm({ p, specialties }: { p: { fullName: string; gender: string; specialty: string; experienceYears: number }; specialties: { slug: string; name: string }[] }) {
  const { t } = useI18n();
  const [state, action] = useActionState(saveOnboardingAction, {} as FormState);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {state.ok ? <Alert tone="success" className="sm:col-span-2">{t("Saved.")}</Alert> : null}
      {state.error ? <Alert tone="danger" className="sm:col-span-2">{state.error}</Alert> : null}
      <Field label={t("Full name as on your registration")} htmlFor="fullName" required className="sm:col-span-2">
        <Input id="fullName" name="fullName" defaultValue={p.fullName} autoComplete="name" />
      </Field>
      <Field label={t("Gender")} htmlFor="gender" required>
        <Select id="gender" name="gender" defaultValue={p.gender}>
          <option value="female">{t("Female")}</option>
          <option value="male">{t("Male")}</option>
          <option value="other">{t("Other")}</option>
        </Select>
      </Field>
      <Field label={t("Years of experience")} htmlFor="experienceYears" required>
        <Input id="experienceYears" name="experienceYears" type="number" min={0} max={70} inputMode="numeric" defaultValue={p.experienceYears} />
      </Field>
      <Field label={t("Main specialty")} htmlFor="specialty" required className="sm:col-span-2">
        <Select id="specialty" name="specialty" defaultValue={p.specialty}>
          {specialties.map((s) => <option key={s.slug} value={s.slug}>{t(s.name)}</option>)}
        </Select>
      </Field>
      <div className="sm:col-span-2"><SubmitButton>{t("Save basics")}</SubmitButton></div>
    </form>
  );
}

/** Reset a form after a successful server action. */
function useResetOnOk(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function QualificationForm() {
  const { t } = useI18n();
  const [state, action] = useActionState(addQualificationAction, {} as FormState);
  const ref = useResetOnOk(state);
  const [key, setKey] = useState(0);
  return (
    <form ref={ref} action={async (fd) => { await action(fd); setKey((k) => k + 1); }} className="grid gap-4 sm:grid-cols-3">
      {state.error ? <Alert tone="danger" className="sm:col-span-3">{state.error}</Alert> : null}
      <Field label={t("Degree")} htmlFor="degree" required hint={t("For example MBBS, MD (Medicine)")}>
        <Input id="degree" name="degree" />
      </Field>
      <Field label={t("College or university")} htmlFor="institution" required>
        <Input id="institution" name="institution" />
      </Field>
      <Field label={t("Year")} htmlFor="year" required>
        <Input id="year" name="year" type="number" inputMode="numeric" min={1950} max={new Date().getFullYear()} />
      </Field>
      <div className="sm:col-span-3">
        <FileUploader key={key} fields={{ forDoctor: "1" }} category="degree_certificate" name="documentId" label={t("Degree certificate")} hint={t("PDF or photo. Only our verification team sees it.")} />
      </div>
      <div className="sm:col-span-3"><SubmitButton variant="secondary">{t("Add qualification")}</SubmitButton></div>
    </form>
  );
}

export function LicenceForm({ countries }: { countries: Country[] }) {
  const { t } = useI18n();
  const [state, action] = useActionState(addLicenceAction, {} as FormState);
  const ref = useResetOnOk(state);
  const [country, setCountry] = useState("IN");
  const [key, setKey] = useState(0);
  const c = countries.find((x) => x.code === country);
  return (
    <form ref={ref} action={async (fd) => { await action(fd); setKey((k) => k + 1); }} className="grid gap-4 sm:grid-cols-2">
      {state.ok ? <Alert tone="success" className="sm:col-span-2">{t("Licence added. Our team will verify it with the council.")}</Alert> : null}
      {state.error ? <Alert tone="danger" className="sm:col-span-2">{state.error}</Alert> : null}
      <Field label={t("Country where you are registered")} htmlFor="country" required>
        <Select id="country" name="country" value={country} onChange={(e) => setCountry(e.target.value)}>
          {countries.map((x) => <option key={x.code} value={x.code}>{t(x.name)}</option>)}
        </Select>
      </Field>
      {c?.licenceScope === "region" ? (
        <Field label={t("State or province")} htmlFor="region" required hint={t("In this country, licences are issued by each state.")}>
          <Select id="region" name="region">
            {c.regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </Select>
        </Field>
      ) : null}
      <Field label={t("Registration number")} htmlFor="number" required>
        <Input id="number" name="number" autoComplete="off" />
      </Field>
      <Field label={t("Issuing council or board")} htmlFor="issuingBody" required hint={t("For example National Medical Commission, Karnataka Medical Council")}>
        <Input id="issuingBody" name="issuingBody" />
      </Field>
      <Field label={t("Valid until")} htmlFor="expiresAt" hint={t("Leave empty if the registration has no expiry date.")}>
        <Input id="expiresAt" name="expiresAt" type="date" />
      </Field>
      <div className="sm:col-span-2">
        <FileUploader key={key} fields={{ forDoctor: "1" }} category="registration_certificate" name="certificateDocumentId" label={t("Registration certificate")} />
      </div>
      <div className="sm:col-span-2"><SubmitButton variant="secondary">{t("Add licence")}</SubmitButton></div>
    </form>
  );
}

export function IdentityUploads({ initial }: { initial: Record<string, Uploaded[]> }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <FileUploader fields={{ forDoctor: "1" }} category="government_id" initial={initial.government_id} label={t("Government photo ID")} hint={t("Aadhaar, passport, PAN or driving licence. You can mask the Aadhaar number except the last 4 digits.")} />
      <FileUploader fields={{ forDoctor: "1" }} category="selfie" initial={initial.selfie} label={t("A clear selfie")} hint={t("We match it with your ID. Good light, no cap or sunglasses.")} />
    </div>
  );
}

export function SubmitForVerification({ disabled }: { disabled?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>({});
  return (
    <div className="space-y-3">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Button
        size="lg"
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            const r = await submitForVerificationAction();
            setState(r);
            if (r.ok) router.refresh();
          })
        }
      >
        {pending ? t("Submitting…") : t("Submit for verification")}
      </Button>
    </div>
  );
}
