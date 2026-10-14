import type { Metadata } from "next";
import Link from "next/link";
import { getViewContext } from "@/server/context";
import { brand } from "@/config/brand";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Contact us" };

export default async function Contact() {
  const { t } = await getViewContext();
  return (
    <div className="container-page max-w-3xl space-y-6 py-8">
      <PageHeader title={t("Contact us")} />
      <dl className="card grid gap-4 p-5 sm:grid-cols-2">
        <div><dt className="text-sm text-fg-muted">{t("Phone")}</dt><dd><a href={`tel:${brand.supportPhone.replace(/\s/g, "")}`} className="font-semibold text-primary">{brand.supportPhone}</a></dd></div>
        <div><dt className="text-sm text-fg-muted">WhatsApp</dt><dd><a href={`https://wa.me/${brand.whatsapp.replace(/\D/g, "")}`} className="font-semibold text-primary">{brand.whatsapp}</a></dd></div>
        <div><dt className="text-sm text-fg-muted">{t("Email")}</dt><dd><a href={`mailto:${brand.supportEmail}`} className="font-semibold text-primary">{brand.supportEmail}</a></dd></div>
        <div><dt className="text-sm text-fg-muted">{t("Registered office")}</dt><dd>{brand.legalEntity}, {brand.registeredAddress}</dd></div>
        <div className="sm:col-span-2"><dt className="text-sm text-fg-muted">{t("Grievance officer")}</dt><dd>{brand.grievanceOfficer.name} · <a href={`mailto:${brand.grievanceOfficer.email}`} className="text-primary underline">{brand.grievanceOfficer.email}</a> · {brand.grievanceOfficer.phone} · {brand.grievanceOfficer.hours}</dd></div>
      </dl>
      <p><Link href="/help/callback" className="font-semibold text-primary underline">{t("Request a call back")}</Link> · <Link href="/help/contact" className="font-semibold text-primary underline">{t("Raise a complaint")}</Link></p>
    </div>
  );
}
