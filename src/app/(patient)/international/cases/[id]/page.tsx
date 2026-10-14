import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewContext } from "@/server/context";
import { getCase } from "@/server/cases";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { CaseView } from "@/components/cases/case-view";
import { CaseStatusBadge } from "@/components/cases/case-list";

export const metadata: Metadata = { title: "Your treatment case" };

export default async function PatientCase({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string; paid?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await getViewContext();
  const data = await getCase(ctx.user!, id);
  if (!data) notFound();
  return (
    <div className="space-y-6">
      <Link href="/international/cases" className="text-primary underline">{ctx.t("All cases")}</Link>
      <PageHeader eyebrow={data.c.ref} title={data.c.treatmentInterest} description={data.patient.fullName} actions={<CaseStatusBadge status={data.c.status} t={ctx.t} />} />
      {sp.new ? <Alert tone="success" title={ctx.t("Enquiry received")}>{ctx.t("A care coordinator will check your reports and reply within 24 hours. You'll get a message here and by SMS/email.")}</Alert> : null}
      {sp.paid ? <Alert tone="success">{ctx.t("Payment received. Thank you.")}</Alert> : null}
      <CaseView data={data} ctx={ctx} />
    </div>
  );
}
