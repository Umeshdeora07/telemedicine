"use client";

import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { answerSecondOpinionAction, type FormState } from "@/server/actions/doctor";
import { Field, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function SecondOpinionForm({ id }: { id: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(answerSecondOpinionAction, {} as FormState);
  if (state.ok) return <Alert tone="success" title={t("Opinion sent")}>{t("The patient has been notified.")}</Alert>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label={t("Your opinion")} htmlFor="opinion" required hint={t("Write for the patient: what you think is going on, how sure you are, and what the reports show.")}>
        <Textarea id="opinion" name="opinion" rows={8} required minLength={30} />
      </Field>
      <Field label={t("What you recommend next")} htmlFor="recommendations" hint={t("Tests, treatment options, or whether an in-person visit is needed. Don't prescribe; a second opinion is advice only.")}>
        <Textarea id="recommendations" name="recommendations" rows={5} />
      </Field>
      <SubmitButton pendingText={t("Sending…")}>{t("Send opinion")}</SubmitButton>
    </form>
  );
}
