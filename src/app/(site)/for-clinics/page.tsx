import type { Metadata } from "next";
import { Building2, ClipboardCheck, Globe2, QrCode, Receipt, Users } from "lucide-react";
import { getViewContext } from "@/server/context";
import { SPOKEN_LANGUAGES } from "@/config/languages";
import { PageHeader } from "@/components/ui/page-header";
import { CallbackForm } from "@/components/support/support-forms";

export const metadata: Metadata = { title: "For clinics and hospitals", description: "Receive patients who start online, check them in by QR, and welcome international patients." };

export default async function ForClinics() {
  const { t, user, locale } = await getViewContext();
  const points = [
    { Icon: Users, title: t("Patients who already know you"), body: t("Online patients who need an examination book your clinic in one tap, with their notes and reports ready.") },
    { Icon: QrCode, title: t("Two-second check-in"), body: t("Scan the patient's QR visit pass or type a 6-letter code. The doctor is told the patient is here.") },
    { Icon: ClipboardCheck, title: t("Your doctors, your slots"), body: t("Manage the roster and clinic slots, close a day when a doctor is on leave.") },
    { Icon: Receipt, title: t("Payments and GST invoices"), body: t("Online or pay-at-desk, with invoices you can reprint.") },
    { Icon: Globe2, title: t("International patients"), body: t("Review reports, send plans and estimates in the patient's currency, and issue e-Medical visa letters.") },
    { Icon: Building2, title: t("A verified listing"), body: t("A hospital page with your accreditations, facilities, doctors and directions.") },
  ];
  return (
    <div className="container-page space-y-12 py-8">
      <PageHeader title={t("Partner with us")} description={t("For clinics and hospitals that want to see online patients in person, and welcome patients from abroad.")} />
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {points.map(({ Icon, title, body }) => <li key={title} className="card space-y-2 p-5"><Icon className="size-6 text-primary" aria-hidden /><h2 className="text-lg font-bold">{title}</h2><p className="text-fg-muted">{body}</p></li>)}
      </ul>
      <section className="card max-w-2xl space-y-3 p-5" aria-labelledby="talk">
        <h2 id="talk" className="text-xl font-bold">{t("Talk to our partnerships team")}</h2>
        <p className="text-fg-muted">{t("We verify registration, GSTIN and accreditations before listing.")}</p>
        <CallbackForm reason="partnership" defaults={{ name: user?.name ?? "", phone: user?.phone ?? "", language: locale }} languages={Object.entries(SPOKEN_LANGUAGES).map(([code, name]) => ({ code, name }))} />
      </section>
    </div>
  );
}
