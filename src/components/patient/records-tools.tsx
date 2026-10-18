"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Share2, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { linkAbhaAction, shareRecordsAction, type PState } from "@/server/actions/patient-app";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function ShareForm({ patientId, docs }: { patientId: string; docs: { id: string; title: string; date: string }[] }) {
  const { t } = useI18n();
  const [s, action] = useActionState(shareRecordsAction, {} as PState);
  const [copied, setCopied] = useState(false);
  if (s.url)
    return (
      <div className="space-y-3">
        <Alert tone="success" title={t("Link ready")}>{t("Anyone with this link can view the chosen documents until it expires. You can stop it any time.")}</Alert>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-2 px-3 py-2 text-sm">{s.url}</code>
          <Button variant="secondary" size="sm" onClick={() => { void navigator.clipboard?.writeText(s.url!); setCopied(true); }}><Copy className="size-4" aria-hidden />{copied ? t("Copied") : t("Copy")}</Button>
        </div>
        <a href={`https://wa.me/?text=${encodeURIComponent(s.url)}`} target="_blank" rel="noopener" className="tap inline-flex items-center gap-2 rounded-xl border border-line px-4 font-semibold text-primary"><Share2 className="size-4" aria-hidden />{t("Send on WhatsApp")}</a>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="patientId" value={patientId} />
      {s.error ? <Alert tone="danger">{s.error}</Alert> : null}
      <fieldset className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-line p-3">
        <legend className="px-1 font-semibold">{t("Documents to share")}</legend>
        {docs.map((d) => (
          <label key={d.id} className="flex min-h-11 items-center gap-3"><input type="checkbox" name="documentIds" value={d.id} className="size-5 accent-[var(--primary)]" /><span>{d.title} <span className="text-sm text-fg-muted">· {d.date}</span></span></label>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Link works for")} htmlFor="days"><Select id="days" name="days" defaultValue="7"><option value="1">{t("1 day")}</option><option value="7">{t("7 days")}</option><option value="30">{t("30 days")}</option></Select></Field>
        <Field label={t("Who is it for? (only you see this)")} htmlFor="note"><Input id="note" name="note" placeholder={t("Dr. Rao, family doctor")} /></Field>
      </div>
      <SubmitButton variant="secondary">{t("Create secure link")}</SubmitButton>
    </form>
  );
}

export function ActionButton({ action, label, confirmText, variant = "ghost" }: { action: () => Promise<PState>; label: string; confirmText?: string; variant?: "ghost" | "secondary" | "danger" }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const run = () => start(async () => { const r = await action(); setMsg(r.error ?? r.message ?? null); setAsk(false); router.refresh(); });
  if (confirmText && ask)
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className="text-sm">{confirmText}</span>
        <Button size="sm" variant="danger" disabled={pending} onClick={run}>{t("Yes")}</Button>
        <Button size="sm" variant="ghost" onClick={() => setAsk(false)}>{t("No")}</Button>
      </span>
    );
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button size="sm" variant={variant} disabled={pending} onClick={() => (confirmText ? setAsk(true) : run())}>{label}</Button>
      {msg ? <span role="status" className="text-sm text-fg-muted">{msg}</span> : null}
    </span>
  );
}

export function DeleteDocButton({ id, title }: { id: string; title: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState(false);
  if (ask)
    return (
      <span className="inline-flex items-center gap-1">
        <Button size="sm" variant="danger" disabled={pending} onClick={() => start(async () => { await fetch(`/api/documents/${id}`, { method: "DELETE" }); router.refresh(); })}>{t("Delete")}</Button>
        <Button size="sm" variant="ghost" onClick={() => setAsk(false)}>{t("Keep")}</Button>
      </span>
    );
  return (
    <button type="button" onClick={() => setAsk(true)} className="tap grid place-items-center rounded-lg text-fg-muted hover:text-danger" aria-label={t("Delete {name}", { name: title })}>
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}

export function AbhaForm({ patientId }: { patientId: string }) {
  const { t } = useI18n();
  const [s, action] = useActionState(linkAbhaAction, {} as PState);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="patientId" value={patientId} />
      <Field label={t("ABHA address")} htmlFor="abha" hint={t("Your ABHA address looks like name@abdm.")} className="min-w-0 flex-1"><Input id="abha" name="abha" placeholder="name.surname@abdm" autoComplete="off" /></Field>
      <SubmitButton variant="secondary">{t("Link ABHA")}</SubmitButton>
      {s.error ? <p role="alert" className="w-full text-sm text-danger">{s.error}</p> : null}
    </form>
  );
}
