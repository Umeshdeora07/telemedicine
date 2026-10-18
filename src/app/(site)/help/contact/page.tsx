import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { getViewContext } from "@/server/context";
import { PageHeader } from "@/components/ui/page-header";
import { ComplaintForm } from "@/components/support/support-forms";
import { grievance } from "@/components/support/brand-info";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Raise a complaint") };
}

export default async function ComplaintPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const sp = await searchParams;
  const { t, user } = await getViewContext();
  return (
    <div className="container-page max-w-2xl space-y-6 py-8">
      <PageHeader
        title={t("Raise a complaint")}
        description={t("We acknowledge every complaint within {h} hours and resolve it within {d} days.", { h: grievance.acknowledgeHours, d: grievance.resolveDays })}
      />
      <div className="card p-5 sm:p-6">
        <ComplaintForm defaults={{ name: user?.name ?? "", contact: user?.email ?? user?.phone ?? "", appointmentRef: sp.ref ?? "" }} />
      </div>
      <p className="text-sm text-fg-muted">
        {grievance.email
          ? grievance.name
            ? t("Not resolved? Write to our grievance officer, {name}, at {email}. {hours}.", { name: grievance.name, email: grievance.email, hours: t(grievance.hours) })
            : t("Not resolved? Write to our grievance officer at {email}. {hours}.", { email: grievance.email, hours: t(grievance.hours) })
          : t("Not resolved? Our grievance officer reviews every complaint that is not settled.")}{" "}
        <Link href="/legal/grievance" className="text-primary underline">
          {t("Grievance redressal")}
        </Link>
      </p>
    </div>
  );
}
