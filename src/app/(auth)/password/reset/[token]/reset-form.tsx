"use client";

import { useActionState, useState } from "react";
import { useI18n } from "@/i18n/client";
import { resetPasswordAction, type ResetState } from "@/server/actions/password";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function ResetPasswordForm({ token }: { token: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(resetPasswordAction, {} as ResetState);
  const [show, setShow] = useState(false);
  return (
    <form action={action} onReset={() => setShow(false)} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && !state.field ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label={t("New password")} htmlFor="password" required hint={t("At least 8 characters.")} error={state.field === "password" ? state.error : undefined}>
        <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={200} required aria-invalid={state.field === "password"} aria-describedby={state.field === "password" ? "password-hint password-error" : "password-hint"} />
      </Field>
      <Checkbox label={t("Show password")} checked={show} onChange={(e) => setShow(e.target.checked)} />
      <SubmitButton className="w-full" size="lg" pendingText={t("Saving…")}>
        {t("Save password")}
      </SubmitButton>
    </form>
  );
}
