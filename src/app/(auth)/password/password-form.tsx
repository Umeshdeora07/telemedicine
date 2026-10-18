"use client";

import { useActionState, useState } from "react";
import { useI18n } from "@/i18n/client";
import { changePasswordAction, type ChangePasswordState } from "@/server/actions/password";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

/** `canUseCode`: the site can send one time codes, the way back in when the old password is forgotten. */
export function PasswordChangeForm({ needsCurrent, hasPassword, canUseCode }: { needsCurrent: boolean; hasPassword: boolean; canUseCode: boolean }) {
  const { t } = useI18n();
  const [state, action] = useActionState(changePasswordAction, {} as ChangePasswordState);
  const [show, setShow] = useState(false);
  const type = show ? "text" : "password";
  // The time to skip the old password can run out while the page is open.
  const askCurrent = needsCurrent || Boolean(state.needsCurrent);
  const currentError = state.field === "current" ? state.error : undefined;
  return (
    <form action={action} onReset={() => setShow(false)} className="space-y-4">
      {state.ok ? <Alert tone="success">{t("Your password is saved. Other devices were logged out.")}</Alert> : null}
      {state.error && !state.field ? <Alert tone="danger">{state.error}</Alert> : null}
      {askCurrent ? (
        <Field
          label={t("Current password")}
          htmlFor="current"
          required
          hint={canUseCode ? t("Forgot it? Log out, log in with a one time code, then come back here within 15 minutes.") : t("Forgot it? Please contact us and we will send you a link to choose a new password.")}
          error={currentError}
        >
          <Input id="current" name="current" type={type} autoComplete="current-password" required aria-invalid={Boolean(currentError)} aria-describedby={currentError ? "current-hint current-error" : "current-hint"} />
        </Field>
      ) : null}
      <Field label={hasPassword ? t("New password") : t("Choose a password")} htmlFor="password" required hint={t("At least 8 characters.")} error={state.field === "password" ? state.error : undefined}>
        <Input id="password" name="password" type={type} autoComplete="new-password" minLength={8} maxLength={200} required aria-invalid={state.field === "password"} aria-describedby={state.field === "password" ? "password-hint password-error" : "password-hint"} />
      </Field>
      <Checkbox label={t("Show password")} checked={show} onChange={(e) => setShow(e.target.checked)} />
      <SubmitButton className="w-full" size="lg" pendingText={t("Saving…")}>
        {t("Save password")}
      </SubmitButton>
    </form>
  );
}
