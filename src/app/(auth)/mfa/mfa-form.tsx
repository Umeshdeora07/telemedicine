"use client";

import { useActionState, useEffect, useState } from "react";
import QRCode from "qrcode";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { demoCurrentTotp, startMfaEnrollment, verifyMfa, type MfaState } from "@/server/actions/auth";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function MfaForm({ enrolled, account, issuer, next, demo }: { enrolled: boolean; account: string; issuer: string; next?: string; demo: boolean }) {
  const { t } = useI18n();
  const [state, action] = useActionState(verifyMfa, {} as MfaState);
  const [secret, setSecret] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);

  useEffect(() => {
    if (!secret) return;
    const uri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    QRCode.toDataURL(uri, { margin: 1, width: 220 }).then(setQr);
  }, [secret, account, issuer]);

  useEffect(() => {
    if (!demo || (!enrolled && !secret)) return;
    const load = () => demoCurrentTotp().then(setDemoCode);
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [demo, enrolled, secret]);

  if (!enrolled && !secret) {
    return (
      <div className="space-y-4">
        <p>{t("Doctors and staff use two-step verification. You'll need an authenticator app such as Google Authenticator, Microsoft Authenticator or Authy.")}</p>
        <Button size="lg" className="w-full" onClick={() => startMfaEnrollment().then((r) => setSecret(r.secret))}>
          <ShieldCheck className="size-5" aria-hidden />
          {t("Set up two-step verification")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!enrolled && secret ? (
        <div className="space-y-3">
          <p>{t("1. Scan this QR code with your authenticator app.")}</p>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt={t("QR code for your authenticator app")} width={220} height={220} className="rounded-xl border border-line bg-white p-2" />
          ) : null}
          <p className="text-sm text-fg-muted">
            {t("Can't scan? Enter this key:")} <code className="break-all rounded bg-surface-2 px-1.5 py-0.5 font-mono">{secret}</code>
          </p>
          <p>{t("2. Enter the 6-digit code it shows.")}</p>
        </div>
      ) : (
        <p>{t("Open your authenticator app and enter the 6-digit code for {issuer}.", { issuer })}</p>
      )}
      {demo && demoCode ? (
        <Alert tone="warning" title={t("Demo mode")}>
          {t("Current code:")} <strong className="font-mono text-lg tracking-widest">{demoCode}</strong>
        </Alert>
      ) : null}
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label={t("Authenticator code")} htmlFor="code" required error={state.error}>
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className="text-center font-mono text-2xl tracking-[0.5em]" aria-invalid={Boolean(state.error)} />
        </Field>
        <SubmitButton size="lg" className="w-full" pendingText={t("Checking…")}>
          {t("Verify")}
        </SubmitButton>
      </form>
    </div>
  );
}
