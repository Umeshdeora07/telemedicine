import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { complaintByRef } from "@/server/support";
import { PageHeader } from "@/components/ui/page-header";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ComplaintStatus } from "./status";

export const metadata: Metadata = { title: "Track a complaint", robots: { index: false } };

export default async function TrackComplaint({ searchParams }: { searchParams: Promise<{ ref?: string; contact?: string }> }) {
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t } = ctx;
  const c = sp.ref && sp.contact ? await complaintByRef(sp.ref, sp.contact) : null;
  return (
    <div className="container-page max-w-2xl space-y-6 py-8">
      <PageHeader title={t("Track a complaint")} />
      <form className="card grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label={t("Reference")} htmlFor="ref" required><Input id="ref" name="ref" defaultValue={sp.ref} placeholder="GR-XXXXXX" /></Field>
        <Field label={t("Phone or email you used")} htmlFor="contact" required><Input id="contact" name="contact" defaultValue={sp.contact} /></Field>
        <Button type="submit">{t("Check")}</Button>
      </form>
      {sp.ref && sp.contact && !c ? <Alert tone="warning">{t("We couldn't find that complaint. Check the reference and contact.")}</Alert> : null}
      {c ? <ComplaintStatus c={c} ctx={ctx} /> : null}
    </div>
  );
}
