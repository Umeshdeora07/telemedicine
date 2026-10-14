import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewContext } from "@/server/context";
import { getCase } from "@/server/cases";
import { PageHeader } from "@/components/ui/page-header";
import { CaseView } from "@/components/cases/case-view";
import { CaseStatusBadge } from "@/components/cases/case-list";

export const metadata: Metadata = { title: "International case" };

export default async function CoordinatorCase({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getViewContext();
  const data = await getCase(ctx.user!, id);
  if (!data) notFound();
  return (
    <div className="space-y-6">
      <Link href="/coordinator/cases" className="text-primary underline">{ctx.t("All cases")}</Link>
      <PageHeader eyebrow={data.c.ref} title={data.patient.fullName} description={data.c.treatmentInterest} actions={<CaseStatusBadge status={data.c.status} t={ctx.t} />} />
      <CaseView data={data} ctx={ctx} />
    </div>
  );
}
