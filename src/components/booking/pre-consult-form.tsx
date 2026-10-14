"use client";

import { useActionState } from "react";
import { CheckCircle2, Siren } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { savePreConsultAction, type PrepState } from "@/server/actions/consult-prep";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { FileUploader, type Uploaded } from "@/components/common/file-uploader";
import { VoiceInput } from "@/components/common/voice-input";
import { RED_FLAGS } from "@/lib/triage";

export function PreConsultForm({
  apptId,
  patientName,
  isMinor,
  defaults,
  uploaded,
  nextHref,
  doctorName,
}: {
  apptId: string;
  patientName: string;
  isMinor: boolean;
  defaults: { mainProblem: string; since: string; currentMedicines: string; allergies: string; pastConditions: string; questions: string; shareHistory: boolean };
  uploaded: Uploaded[];
  nextHref: string;
  doctorName: string;
}) {
  const { t } = useI18n();
  const [state, action] = useActionState(savePreConsultAction, {} as PrepState);
  if (state.saved) {
    return (
      <div className="space-y-4 text-center" role="status">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
        <p className="text-lg font-bold">{t("Thank you. {doctor} will read this before the consult.", { doctor: doctorName })}</p>
        <ButtonLink href={nextHref} size="lg">
          {t("Continue")}
        </ButtonLink>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="apptId" value={apptId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label={t("What is the main problem?")} htmlFor="mainProblem" required hint={t("In your own words. You can also tap the microphone and speak.")}>
        <div className="flex items-start gap-2">
          <Textarea id="mainProblem" name="mainProblem" defaultValue={defaults.mainProblem} required rows={3} />
          <VoiceInput targetId="mainProblem" />
        </div>
      </Field>
      <Field label={t("Since when?")} htmlFor="since" required>
        <Input id="since" name="since" defaultValue={defaults.since} placeholder={t("For example: 3 days, since last Monday")} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Medicines {name} takes now", { name: patientName })} htmlFor="currentMedicines" required hint={t("Include tablets, syrups, creams, supplements.")}>
          <Textarea id="currentMedicines" name="currentMedicines" defaultValue={defaults.currentMedicines} rows={3} />
        </Field>
        <Field label={t("Allergies")} htmlFor="allergies" required hint={t("To medicines or food. Write 'None' if none.")}>
          <Textarea id="allergies" name="allergies" defaultValue={defaults.allergies} rows={3} />
        </Field>
      </div>
      <Field label={t("Past illnesses or operations")} htmlFor="pastConditions" required>
        <Textarea id="pastConditions" name="pastConditions" defaultValue={defaults.pastConditions} rows={2} />
      </Field>
      <Field label={t("Questions you want to ask the doctor")} htmlFor="questions" hint={t("It's easy to forget during the call — write them here.")}>
        <div className="flex items-start gap-2">
          <Textarea id="questions" name="questions" defaultValue={defaults.questions} rows={2} />
          <VoiceInput targetId="questions" />
        </div>
      </Field>
      <FileUploader
        fields={{ appointmentId: apptId }}
        initial={uploaded}
        name="documentIds"
        label={t("Reports or photos (optional)")}
        hint={t("Lab reports, prescriptions, or a photo of the problem area. Photos are compressed for slow networks.")}
      />
      {isMinor ? (
        <fieldset className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
          <legend className="px-1 font-medium text-heading">{t("Parent or guardian who will be present")}</legend>
          <Field label={t("Name")} htmlFor="guardianName" required>
            <Input id="guardianName" name="guardianName" required />
          </Field>
          <Field label={t("Relationship")} htmlFor="guardianRelationship" required>
            <Input id="guardianRelationship" name="guardianRelationship" placeholder={t("Mother, father, guardian…")} required />
          </Field>
        </fieldset>
      ) : null}
      <details className="rounded-xl border border-danger/30 p-4">
        <summary className="tap flex cursor-pointer list-none items-center gap-2 font-semibold text-danger">
          <Siren className="size-5" aria-hidden />
          {t("Has anything become worse or urgent?")}
        </summary>
        <div className="mt-3 grid gap-1.5">
          {RED_FLAGS.slice(0, 8).map((f) => (
            <label key={f.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg p-1.5">
              <input type="checkbox" name="redFlags" value={f.id} className="mt-0.5 size-6 shrink-0 accent-[var(--danger-solid)]" />
              <span>{t(f.label)}</span>
            </label>
          ))}
        </div>
      </details>
      <div className="space-y-3 rounded-xl bg-surface-2 p-4">
        <Checkbox id="shareHistory" name="shareHistory" defaultChecked={defaults.shareHistory} label={t("Let this doctor see {name}'s past records", { name: patientName })} hint={t("Only for 30 days. You can stop sharing any time in Settings → Privacy.")} />
        <Checkbox id="updateProfile" name="updateProfile" defaultChecked label={t("Save medicines and allergies to the health profile")} />
        <Checkbox id="consent" name="consent" required label={t("I agree to this teleconsultation and understand the doctor may advise an in-person visit.")} />
      </div>
      <SubmitButton size="lg" className="w-full" pendingText={t("Saving…")}>
        {t("Send to doctor")}
      </SubmitButton>
    </form>
  );
}
