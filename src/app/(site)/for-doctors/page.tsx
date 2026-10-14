import type { Metadata } from "next";
import { BadgeCheck, CalendarClock, Coins, FileSignature, Globe2, ShieldCheck, Stethoscope, Video } from "lucide-react";
import { getViewContext } from "@/server/context";
import { env } from "@/config/env";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "For doctors", description: "Consult online and in clinic, with TPG-compliant prescriptions, fair payouts and verified patients." };

export default async function ForDoctors() {
  const { t } = await getViewContext();
  const points = [
    { Icon: CalendarClock, title: t("Your hours, your fees"), body: t("Set online and clinic hours, consult length and fees per mode and currency. Go “available now” for instant consults when you have a gap.") },
    { Icon: FileSignature, title: t("Prescriptions done right"), body: t("Templates and quick buttons. Medicine lists follow the Telemedicine Practice Guidelines 2020; prohibited drugs are blocked, allergy and duplicate warnings shown. Digitally signed with a QR check.") },
    { Icon: Video, title: t("A calm consult room"), body: t("Patient answers, reports and history beside the video. Notes autosave. Recommend a clinic visit or tests in one tap.") },
    { Icon: Coins, title: t("Paid weekly"), body: t("Fees are released after each consult and paid every Monday, with a clear statement. Platform commission {p}%.", { p: Math.round(env.commissionRate * 100) }) },
    { Icon: Globe2, title: t("Patients from abroad"), body: t("Families abroad book for parents in India. If you hold a foreign licence (e.g. US state, UK GMC), add it to see patients located there.") },
    { Icon: ShieldCheck, title: t("Protected"), body: t("Identity confirmation and consent are built into every consult. Records are encrypted and every access is logged.") },
  ];
  return (
    <div className="container-page space-y-12 py-8">
      <PageHeader eyebrow={<span className="inline-flex items-center gap-2"><Stethoscope className="size-4" aria-hidden />{t("For doctors")}</span>} title={t("Practise online the right way")} description={t("Join verified doctors seeing patients from across India and families abroad.")} actions={<ButtonLink href="/for-doctors/apply" size="lg">{t("Apply to join")}</ButtonLink>} />
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {points.map(({ Icon, title, body }) => <li key={title} className="card space-y-2 p-5"><Icon className="size-6 text-primary" aria-hidden /><h2 className="text-lg font-bold">{title}</h2><p className="text-fg-muted">{body}</p></li>)}
      </ul>
      <section className="card space-y-3 p-6">
        <h2 className="flex items-center gap-2 text-xl font-bold"><BadgeCheck className="size-6 text-primary" aria-hidden />{t("How verification works")}</h2>
        <ol className="list-decimal space-y-1 ps-5">
          <li>{t("Sign up with your work email and set up two-step sign-in.")}</li>
          <li>{t("Upload your registration certificate (NMC / State Medical Council), degree certificates, a government ID and a selfie.")}</li>
          <li>{t("We check your registration on the official register and call you if anything is unclear — usually 1–2 working days.")}</li>
          <li>{t("Set up your profile, fees and signature, and go live. We re-verify every year.")}</li>
        </ol>
      </section>
    </div>
  );
}
