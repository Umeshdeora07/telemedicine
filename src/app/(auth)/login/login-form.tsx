"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Mail, Smartphone } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { loginAction, type LoginState } from "@/server/actions/auth";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { DIAL_CODES } from "@/config/dial-codes";
import { cn } from "@/lib/utils";

/** `methods`: the ways a code can be sent on this site (text message, email or both). */
export function LoginForm({ next, defaultDial, methods = ["phone", "email"] }: { next?: string; defaultDial: string; methods?: ("phone" | "email")[] }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"phone" | "email">(methods[0] ?? "phone");
  const [state, action] = useActionState(loginAction, { step: "start" } as LoginState);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const sentKey = state.step === "verify" ? `${state.identifier}:${state.devCode ?? ""}:${state.info ?? ""}` : "";

  // A new code was sent: start the resend cooldown (adjusting state during render, not in an effect).
  const [lastSent, setLastSent] = useState("");
  if (sentKey !== lastSent) {
    setLastSent(sentKey);
    if (state.step === "verify" && !state.error) setCooldown(30);
  }
  useEffect(() => {
    if (sentKey) codeRef.current?.focus();
  }, [sentKey]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  if (state.step === "verify") {
    return (
      <div className="space-y-5">
        <p>
          {t("Enter the 6 digit code we sent to")} <strong dir="ltr" className="whitespace-nowrap">{state.display}</strong>
        </p>
        {state.devCode ? (
          <Alert tone="info">
            {state.kind === "email" ? t("Emails are not connected yet, so here is your code:") : t("Text messages are not connected yet, so here is your code:")}{" "}
            <strong className="font-mono text-lg tracking-widest">{state.devCode}</strong>
          </Alert>
        ) : null}
        <form action={action} className="space-y-4">
          <input type="hidden" name="intent" value="verify" />
          <input type="hidden" name="next" value={next ?? ""} />
          <Field label={t("Code")} htmlFor="code" required error={state.error}>
            <Input
              ref={codeRef}
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              required
              aria-invalid={Boolean(state.error)}
              aria-describedby={state.error ? "code-error" : undefined}
              className="text-center font-mono text-2xl tracking-[0.5em]"
            />
          </Field>
          {state.info ? (
            <p role="status" className="text-sm text-success">
              {state.info}
            </p>
          ) : null}
          <SubmitButton className="w-full" size="lg" pendingText={t("Checking…")}>
            {t("Verify and continue")}
          </SubmitButton>
        </form>
        <form action={action} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <button type="submit" name="intent" value="reset" formNoValidate className="tap font-semibold text-primary underline-offset-4 hover:underline">
            {t("Change number or email")}
          </button>
          <button
            type="submit"
            name="intent"
            value="resend"
            formNoValidate
            disabled={cooldown > 0}
            className="tap font-semibold text-primary underline-offset-4 hover:underline disabled:text-fg-muted disabled:no-underline"
          >
            {cooldown > 0 ? t("Resend code in {s}s", { s: cooldown }) : t("Resend code")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {methods.length > 1 ? (
      <div role="tablist" aria-label={t("Log in with")} className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(
          [
            ["phone", t("Mobile number"), Smartphone],
            ["email", t("Email"), Mail],
          ] as const
        ).map(([m, label, Icon]) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn("tap inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-2 text-[0.9375rem] font-medium", mode === m ? "bg-surface text-heading shadow-sm" : "text-fg-muted")}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>
      ) : null}
      <form action={action} className="space-y-4">
        <input type="hidden" name="intent" value="request" />
        {mode === "phone" ? (
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="block font-medium text-heading">
              {t("Mobile number")}
            </label>
            <div className="flex gap-2">
              <Select name="dial" defaultValue={defaultDial} aria-label={t("Country code")} className="w-[6.5rem] shrink-0 px-2.5">
                {DIAL_CODES.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code}
                  </option>
                ))}
              </Select>
              <Input
                id="identifier"
                name="identifier"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="98100 00001"
                required
                aria-invalid={Boolean(state.error)}
                aria-describedby={state.error ? "identifier-error" : "identifier-hint"}
              />
            </div>
            <p id="identifier-hint" className="text-sm text-fg-muted">
              {t("We will send a 6 digit code by text message.")}
            </p>
          </div>
        ) : (
          <Field label={t("Email")} htmlFor="identifier" required hint={t("We will email you a 6 digit code.")}>
            <Input id="identifier" name="identifier" type="email" autoComplete="email" required aria-invalid={Boolean(state.error)} />
          </Field>
        )}
        {state.error ? (
          <p id="identifier-error" role="alert" className="text-sm font-medium text-danger">
            {state.error}
          </p>
        ) : null}
        <SubmitButton className="w-full" size="lg" pendingText={t("Sending…")}>
          {t("Send code")}
        </SubmitButton>
      </form>
    </div>
  );
}
