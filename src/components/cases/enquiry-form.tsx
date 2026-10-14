"use client";

import { useActionState, useState } from "react";
import { useI18n } from "@/i18n/client";
import { createCaseAction, type CaseFormState } from "@/server/actions/cases";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { FileUploader } from "@/components/common/file-uploader";

export function EnquiryForm({ people, countries, specialties, clinics, currencies, defaults, languages }: { people: { id: string; name: string }[]; countries: { code: string; name: string }[]; specialties: { id: string; name: string }[]; clinics: { id: string; name: string; city: string }[]; currencies: string[]; defaults: { country: string; currency: string; language: string }; languages: { code: string; name: string }[] }) {
  const { t } = useI18n();
  const [s, action] = useActionState(createCaseAction, {} as CaseFormState);
  const [pid, setPid] = useState(people[0]?.id ?? "");
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {s.error ? <Alert tone="danger" className="sm:col-span-2">{s.error}</Alert> : null}
      <Field label={t("Patient")} htmlFor="e-p"><Select id="e-p" name="patientId" value={pid} onChange={(e) => setPid(e.target.value)}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      <Field label={t("Patient lives in")} htmlFor="e-c"><Select id="e-c" name="homeCountry" defaultValue={defaults.country}>{countries.map((c) => <option key={c.code} value={c.code}>{t(c.name)}</option>)}</Select></Field>
      <Field label={t("Treatment you're considering")} htmlFor="e-ti" required className="sm:col-span-2"><Input id="e-ti" name="treatmentInterest" placeholder={t("Knee replacement, heart bypass, IVF, cancer treatment…")} /></Field>
      <Field label={t("Specialty")} htmlFor="e-s"><Select id="e-s" name="specialtyId" defaultValue=""><option value="">{t("Not sure")}</option>{specialties.map((x) => <option key={x.id} value={x.id}>{t(x.name)}</option>)}</Select></Field>
      <Field label={t("Preferred hospital")} htmlFor="e-h"><Select id="e-h" name="preferredClinicId" defaultValue=""><option value="">{t("Help me choose")}</option>{clinics.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.city}</option>)}</Select></Field>
      <Field label={t("Tell us about the problem")} htmlFor="e-d" required className="sm:col-span-2" hint={t("What's wrong, since when, what doctors have said, treatments tried.")}><Textarea id="e-d" name="description" rows={5} /></Field>
      <Field label={t("Show costs in")} htmlFor="e-cur"><Select id="e-cur" name="currency" defaultValue={defaults.currency}>{currencies.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      <Field label={t("Language you're comfortable in")} htmlFor="e-l"><Select id="e-l" name="preferredLanguage" defaultValue={defaults.language}>{languages.map((l) => <option key={l.code} value={l.code}>{t(l.name)}</option>)}</Select></Field>
      <div className="sm:col-span-2">
        <FileUploader key={pid} fields={{ patientId: pid }} name="documentIds" label={t("Medical reports")} hint={t("Recent reports, scans (reports are enough; images if you have them), discharge summaries, current prescriptions.")} />
      </div>
      <Checkbox name="consent" required className="sm:col-span-2" label={t("I agree to share these reports with the hospital and doctors in India who will review my case.")} hint={t("Your data is stored in India and shared only for this case. You can withdraw any time.")} />
      <div className="sm:col-span-2"><SubmitButton>{t("Send enquiry")}</SubmitButton></div>
    </form>
  );
}
