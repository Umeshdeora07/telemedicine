"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Mail, Smartphone } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { loginAction, type LoginState } from "@/server/actions/auth";
import { passwordAuthAction, type PasswordAuthState } from "@/server/actions/password";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { DIAL_CODES } from "@/config/dial-codes";
import { cn } from "@/lib/utils";

/** `methods`: the ways a code can be sent on this site (text message, email or both). */
function CodeForm({ next, defaultDial, methods }: { next?: string; defaultDial: string; methods: ("phone" | "email")[] }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"phone" | "email">(methods[0] ?? "phone");
  const [state, action] = useActionState(loginAction, { step: "start" } as LoginState);
  // React empties the form after each answer. A select remounted with the chosen
  // code as its default (new key per answer) keeps that code through the reset.
  const [dial, setDial] = useState(defaultDial);
  const [answers, setAnswers] = useState(0);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    setAnswers((a) => a + 1);
  }
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
              <Select key={`dial-${answers}`} name="dial" defaultValue={dial} onChange={(e) => setDial(e.target.value)} aria-label={t("Country code")} className="w-[6.5rem] shrink-0 px-2.5">
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

type Contact = "phone" | "email";

/**
 * The login card: an email or mobile number with a password (works on every
 * site), and a one time code by text message or email where that service is
 * connected (`methods`).
 */
export function LoginForm({ next, defaultDial, methods, passwords }: { next?: string; defaultDial: string; methods: Contact[]; passwords: boolean }) {
  const { t } = useI18n();
  // A code proves the email or number, so it comes first where codes can be sent.
  const [view, setView] = useState<"password" | "code">(methods.length || !passwords ? "code" : "password");
  // "Forgot your password?" then a code: go on to choose a new one.
  const [codeNext, setCodeNext] = useState(next);
  if (view === "code" && methods.length) {
    return (
      <div className="space-y-5">
        <CodeForm key={codeNext ?? ""} next={codeNext} defaultDial={defaultDial} methods={methods} />
        {passwords ? (
          <button type="button" onClick={() => setView("password")} className="tap text-sm font-semibold text-primary underline-offset-4 hover:underline">
            {t("Log in with a password instead")}
          </button>
        ) : null}
      </div>
    );
  }
  if (!passwords) return null;
  return (
    <PasswordForm
      next={next}
      defaultDial={defaultDial}
      onUseCode={
        methods.length
          ? (forgot) => {
              setCodeNext(forgot ? "/password" : next);
              setView("code");
            }
          : undefined
      }
    />
  );
}

function ContactTabs({ value, onChange }: { value: Contact; onChange: (c: Contact) => void }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("Mobile number or email")} className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
      {(
        [
          ["phone", t("Mobile number"), Smartphone],
          ["email", t("Email"), Mail],
        ] as const
      ).map(([c, label, Icon]) => (
        <button
          key={c}
          role="radio"
          type="button"
          aria-checked={value === c}
          onClick={() => onChange(c)}
          className={cn("tap inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-2 text-[0.9375rem] font-medium", value === c ? "bg-surface text-heading shadow-sm" : "text-fg-muted")}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

function PasswordForm({ next, defaultDial, onUseCode }: { next?: string; defaultDial: string; onUseCode?: (forgot: boolean) => void }) {
  const { t } = useI18n();
  const [intent, setIntent] = useState<"login" | "signup">("login");
  const [contact, setContact] = useState<Contact>("phone");
  const [show, setShow] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [state, action] = useActionState(passwordAuthAction, {} as PasswordAuthState);
  // Errors belong to the tab they came from: switching tabs hides them until the next answer.
  const [hidden, setHidden] = useState<PasswordAuthState | null>(null);
  const live = state === hidden ? ({} as PasswordAuthState) : state;
  const forgotId = useId();
  const signup = intent === "signup";
  // A new key each answer, so screen readers announce the same error again.
  const errorKey = state.n ?? 0;
  const idError = live.field === "identifier" ? <span key={errorKey}>{live.error}</span> : undefined;
  const pwError = live.field === "password" ? <span key={errorKey}>{live.error}</span> : undefined;
  const otherError = live.error && !live.field ? live.error : undefined;
  const identifier = state.values?.identifier ?? "";
  const dial = state.values?.dial ?? defaultDial;
  // Keep the address typed before an error, and show the right field for it.
  const [lastValues, setLastValues] = useState(state.values);
  if (state.values !== lastValues) {
    setLastValues(state.values);
    if (state.values) setContact(state.values.identifier.includes("@") ? "email" : "phone");
  }

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label={t("Log in or create an account")} className="grid grid-cols-2 border-b border-line">
        {(
          [
            ["login", t("Log in")],
            ["signup", t("Create account")],
          ] as const
        ).map(([i, label]) => (
          <button
            key={i}
            role="tab"
            type="button"
            aria-selected={intent === i}
            aria-controls="password-form"
            onClick={() => {
              setIntent(i);
              setForgot(false);
              setHidden(state);
            }}
            className={cn("tap -mb-px border-b-2 px-2 font-semibold", intent === i ? "border-primary text-primary" : "border-transparent text-fg-muted hover:text-heading")}
          >
            {label}
          </button>
        ))}
      </div>
      {/* React empties the form after each answer; the Show password box follows. */}
      <form id="password-form" role="tabpanel" aria-label={signup ? t("Create account") : t("Log in")} action={action} onReset={() => setShow(false)} className="space-y-4">
        <input type="hidden" name="intent" value={intent} />
        <input type="hidden" name="next" value={next ?? ""} />
        <ContactTabs value={contact} onChange={setContact} />
        {contact === "phone" ? (
          <div className="space-y-1.5">
            <label htmlFor="pw-identifier" className="block font-medium text-heading">
              {t("Mobile number")}
            </label>
            <div className="flex gap-2">
              {/* Keyed on the dial sent, so it stays on that code after an error. */}
              <Select key={`dial-${dial}`} name="dial" defaultValue={dial} aria-label={t("Country code")} className="w-[6.5rem] shrink-0 px-2.5">
                {DIAL_CODES.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code}
                  </option>
                ))}
              </Select>
              <Input
                key={`phone-${identifier}`}
                id="pw-identifier"
                name="identifier"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="98100 00001"
                defaultValue={identifier.includes("@") ? "" : identifier}
                required
                aria-invalid={Boolean(idError)}
                aria-describedby={idError ? "pw-identifier-error" : undefined}
              />
            </div>
            {idError ? (
              <p id="pw-identifier-error" role="alert" className="text-sm font-medium text-danger">
                {idError}
              </p>
            ) : null}
          </div>
        ) : (
          <Field label={t("Email")} htmlFor="pw-identifier" required error={idError}>
            <Input
              key={`email-${identifier}`}
              id="pw-identifier"
              name="identifier"
              type="email"
              autoComplete="email"
              defaultValue={identifier.includes("@") ? identifier : ""}
              required
              aria-invalid={Boolean(idError)}
              aria-describedby={idError ? "pw-identifier-error" : undefined}
            />
          </Field>
        )}
        <Field label={signup ? t("Choose a password") : t("Password")} htmlFor="password" required hint={signup ? t("At least 8 characters.") : undefined} error={pwError}>
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete={signup ? "new-password" : "current-password"}
            minLength={signup ? 8 : undefined}
            maxLength={200}
            required
            aria-invalid={Boolean(pwError)}
            aria-describedby={[signup ? "password-hint" : "", pwError ? "password-error" : ""].filter(Boolean).join(" ") || undefined}
          />
        </Field>
        <Checkbox label={t("Show password")} checked={show} onChange={(e) => setShow(e.target.checked)} />
        {otherError ? (
          <Alert key={errorKey} tone="danger">
            {otherError}
          </Alert>
        ) : null}
        <SubmitButton className="w-full" size="lg" pendingText={signup ? t("Creating your account…") : t("Logging in…")}>
          {signup ? t("Create account") : t("Log in")}
        </SubmitButton>
      </form>
      {!signup ? (
        <div className="space-y-3">
          <button type="button" aria-expanded={forgot} aria-controls={forgotId} onClick={() => setForgot((f) => !f)} className="tap text-sm font-semibold text-primary underline-offset-4 hover:underline">
            {t("Forgot your password?")}
          </button>
          {forgot ? (
            <div id={forgotId} className="space-y-2 rounded-xl bg-surface-2 p-4 text-sm">
              {onUseCode ? (
                <>
                  <p>{t("Log in with a one time code instead. Then you can choose a new password under Password in your account menu.")}</p>
                  <Button type="button" variant="secondary" size="sm" onClick={() => onUseCode(true)}>
                    {t("Get a one time code")}
                  </Button>
                </>
              ) : (
                <p>
                  {t("Please contact us from the email or number on your account. We will send you a link to choose a new password.")}{" "}
                  <Link href="/contact" className="font-semibold text-primary underline">
                    {t("Contact us")}
                  </Link>
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      {onUseCode ? (
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => onUseCode(false)}>
          {t("Log in with a one time code")}
        </Button>
      ) : null}
    </div>
  );
}
