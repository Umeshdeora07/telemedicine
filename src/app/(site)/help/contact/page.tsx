import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { brand } from "@/config/brand";
import { PageHeader } from "@/components/ui/page-header";
import { ComplaintForm } from "@/components/support/support-forms";

export const metadata: Metadata = { title: "Raise a complaint" };

export default async function ComplaintPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const sp = await searchParams;
  const { t, user } = await getViewContext();
  return (
    <div className="container-page max-w-2xl space-y-6 py-8">
      <PageHeader title={t("Raise a complaint")} description={t("We acknowledge every complaint within {h} hours and resolve it within {d} days.", { h: brand.grievanceSla.acknowledgeHours, d: brand.grievanceSla.resolveDays })} />
      <div className="card p-5"><ComplaintForm defaults={{ name: user?.name ?? "", contact: user?.email ?? user?.phone ?? "", appointmentRef: sp.ref ?? "" }} /></div>
      <p className="text-sm text-fg-muted">{t("Not resolved? Write to our Grievance Officer, {name}, at {email}. {hours}.", { name: brand.grievanceOfficer.name, email: brand.grievanceOfficer.email, hours: brand.grievanceOfficer.hours })}</p>
    </div>
  );
}
