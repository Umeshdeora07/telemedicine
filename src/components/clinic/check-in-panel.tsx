"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { checkInAction, type CheckInState } from "@/server/actions/clinic";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { QrScanner } from "./qr-scanner";

export function CheckInPanel({ initialToken }: { initialToken?: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<CheckInState>({});
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const run = (input: { token?: string; code?: string }) => start(async () => setState(await checkInAction(input)));

  if (state.ok)
    return (
      <div className="card space-y-4 p-6 text-center" role="status">
        <CheckCircle2 className="mx-auto size-14 text-success animate-pop" aria-hidden />
        <p className="text-xl font-bold">{state.already ? t("Already checked in") : t("Checked in")}</p>
        <p className="text-fg-muted">{t("Visit {ref}. The doctor has been told the patient is here.", { ref: state.ref ?? "" })}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={`/clinic/visits/${state.apptId}`} className="tap inline-flex items-center rounded-xl bg-primary px-5 font-semibold text-on-primary">{t("Open visit")}</Link>
          <Button variant="secondary" onClick={() => { setState({}); setCode(""); }}>{t("Next patient")}</Button>
        </div>
      </div>
    );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="card space-y-4 p-5" aria-labelledby="scan">
        <h2 id="scan" className="text-lg font-bold">{t("Scan the QR code")}</h2>
        {initialToken ? (
          <div className="space-y-3">
            <p>{t("A visit pass was opened on this device.")}</p>
            <Button size="lg" disabled={pending} onClick={() => run({ token: initialToken })}>{pending ? t("Checking in…") : t("Confirm check-in")}</Button>
          </div>
        ) : (
          <QrScanner onResult={(text) => run({ token: text })} />
        )}
      </section>
      <section className="card space-y-4 p-5" aria-labelledby="code">
        <h2 id="code" className="text-lg font-bold">{t("Or type the code")}</h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run({ code });
          }}
        >
          <Field label={t("6-character code on the visit pass")} htmlFor="pass-code">
            <Input id="pass-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} autoComplete="off" autoCapitalize="characters" spellCheck={false} className="font-mono text-2xl tracking-[0.3em]" />
          </Field>
          <Button type="submit" disabled={pending || code.trim().length < 4}>{pending ? t("Checking in…") : t("Check in")}</Button>
        </form>
        <p className="text-sm text-fg-muted">{t("Ask for photo ID if the name on the pass doesn't match the person in front of you.")}</p>
      </section>
      {state.error ? <Alert tone="danger" className="md:col-span-2">{state.error}</Alert> : null}
    </div>
  );
}
