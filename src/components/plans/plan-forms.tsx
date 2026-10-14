"use client";

import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { buyPlanAction, type PState } from "@/server/actions/patient-app";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function BuyPlanForm({ slug, members, people }: { slug: string; members: number; people: { id: string; name: string }[] }) {
  const { t } = useI18n();
  const [s, action] = useActionState(buyPlanAction, {} as PState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="plan" value={slug} />
      {s.error ? <Alert tone="danger">{s.error}</Alert> : null}
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">{members > 1 ? t("Who is covered (up to {n})", { n: members }) : t("Who is it for")}</legend>
        {people.map((p, i) => (
          <label key={p.id} className="flex min-h-11 items-center gap-2">
            <input type={members > 1 ? "checkbox" : "radio"} name="patientIds" value={p.id} defaultChecked={i === 0} className="size-5 accent-[var(--primary)]" />{p.name}
          </label>
        ))}
      </fieldset>
      <SubmitButton className="w-full">{t("Start plan")}</SubmitButton>
      <p className="text-xs text-fg-muted">{t("Renews monthly. Cancel any time; you keep it until the end of the month.")}</p>
    </form>
  );
}
