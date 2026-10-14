"use client";

import { useActionState, useState } from "react";
import { useI18n } from "@/i18n/client";
import { secondOpinionAction, type PState } from "@/server/actions/patient-app";
import { Checkbox, Field, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { FileUploader } from "@/components/common/file-uploader";

export function SecondOpinionRequestForm({ people, specialties, fee, country, region }: { people: { id: string; name: string }[]; specialties: { slug: string; name: string }[]; fee: string; country: string; region: string | null }) {
  const { t } = useI18n();
  const [s, action] = useActionState(secondOpinionAction, {} as PState);
  const [pid, setPid] = useState(people[0]?.id ?? "");
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="country" value={country} />
      <input type="hidden" name="region" value={region ?? ""} />
      {s.error ? <Alert tone="danger">{s.error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("For")} htmlFor="so-p"><Select id="so-p" name="patientId" value={pid} onChange={(e) => setPid(e.target.value)}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label={t("Specialty")} htmlFor="so-s"><Select id="so-s" name="specialty">{specialties.map((x) => <option key={x.slug} value={x.slug}>{t(x.name)}</option>)}</Select></Field>
      </div>
      <Field label={t("Your question")} htmlFor="so-q" required hint={t("For example: “My doctor advised knee replacement. Is surgery needed now, or can I try other treatment first?”")}><Textarea id="so-q" name="question" rows={4} /></Field>
      <Field label={t("Short history (optional)")} htmlFor="so-h" hint={t("Symptoms, how long, treatment so far, medicines.")}><Textarea id="so-h" name="history" rows={3} /></Field>
      <FileUploader key={pid} fields={{ patientId: pid }} name="documentIds" label={t("Reports, scans and discharge summaries")} hint={t("Clear photos are fine. Include the original doctor's advice if you have it.")} />
      <Checkbox name="consent" required label={t("I agree to share these reports with the reviewing specialist.")} hint={t("A second opinion is written advice. It is not a prescription, and doesn't replace an examination.")} />
      <SubmitButton>{t("Continue to pay {fee}", { fee })}</SubmitButton>
    </form>
  );
}
