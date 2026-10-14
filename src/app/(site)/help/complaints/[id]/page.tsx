import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getViewContext } from "@/server/context";
import { complaintForUser } from "@/server/support";
import { PageHeader } from "@/components/ui/page-header";
import { ComplaintStatus } from "../status";

export const metadata: Metadata = { title: "Your complaint", robots: { index: false } };

export default async function MyComplaint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getViewContext();
  if (!ctx.user) redirect(`/login?next=/help/complaints/${id}`);
  const c = await complaintForUser(id, ctx.user.id);
  if (!c) notFound();
  return (
    <div className="container-page max-w-2xl space-y-6 py-8">
      <PageHeader title={ctx.t("Your complaint")} />
      <ComplaintStatus c={c} ctx={ctx} />
    </div>
  );
}
