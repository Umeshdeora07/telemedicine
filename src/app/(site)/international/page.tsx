import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { BedDouble, FileText, Globe2, Languages, Plane, ShieldCheck, Stethoscope, Video } from "lucide-react";
import { getDb } from "@/db";
import { clinics } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlobeIllustration } from "@/components/illustrations/hero";

export const metadata: Metadata = { title: "Treatment in India", description: "Plan surgery or treatment in India with verified hospitals: free review, cost estimate in your currency, visa letter, travel and follow-up." };

export default async function InternationalLanding() {
  const ctx = await getViewContext();
  const { t, user } = ctx;
  const hospitals = await (await getDb()).select().from(clinics).where(eq(clinics.acceptsInternational, true));
  const cta = user ? "/international/new" : "/login?next=/international/new";
  return (
    <div className="space-y-14 pb-10">
      <section className="bg-gradient-to-b from-primary-soft/60 to-page">
        <div className="container-page grid items-center gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0 space-y-5">
            <h1 className="text-[2rem] font-extrabold leading-tight sm:text-5xl">{t("Plan your treatment in India, with someone by your side")}</h1>
            <p className="max-w-xl text-lg text-fg-muted">{t("Send your reports for a free review by a specialist. Get a clear plan and cost estimate in your currency, your visa letter, and help with travel, stay and an interpreter.")}</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={cta} size="lg">{t("Send my reports")}</ButtonLink>
              <ButtonLink href="/help/callback?reason=international" size="lg" variant="outline">{t("Talk to a coordinator")}</ButtonLink>
            </div>
          </div>
          <GlobeIllustration className="mx-auto w-full max-w-sm" />
        </div>
      </section>
      <section className="container-page space-y-4">
        <h2 className="text-2xl font-bold">{t("What you get")}</h2>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: FileText, title: t("Free review in 3 days"), body: t("A specialist reviews your reports. If treatment isn't needed, we'll say so.") },
            { Icon: Globe2, title: t("Estimate in your currency"), body: t("A cost range with what's included and not, valid for 30 days, converted at the day's rate.") },
            { Icon: Video, title: t("Video call before you travel"), body: t("Meet the treating doctor online first, where your country's rules allow.") },
            { Icon: Plane, title: t("Visa letter and travel"), body: t("e-Medical visa letter for you and up to two attendants, airport pickup and a local SIM.") },
            { Icon: BedDouble, title: t("Stay near the hospital"), body: t("Guest houses and service apartments for recovery, at fair prices.") },
            { Icon: Languages, title: t("Interpreters"), body: t("Arabic, Bengali, French, Russian, Swahili and more, at every appointment.") },
            { Icon: ShieldCheck, title: t("Accredited hospitals"), body: t("NABH and JCI accredited partners with international patient desks.") },
            { Icon: Stethoscope, title: t("Follow-up from home"), body: t("Records to take home, and follow-up consults where your country allows.") },
          ].map(({ Icon, title, body }) => <li key={title} className="card space-y-2 p-5"><Icon className="size-6 text-primary" aria-hidden /><h3 className="font-bold">{title}</h3><p className="text-fg-muted">{body}</p></li>)}
        </ul>
      </section>
      <section className="container-page space-y-4">
        <h2 className="text-2xl font-bold">{t("Partner hospitals")}</h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {hospitals.map((h) => (
            <li key={h.id}><Link href={`/hospitals/${h.slug}`} className="card block space-y-2 p-5 hover:border-primary"><span className="text-lg font-bold">{h.name}</span><span className="block text-fg-muted">{h.city}, {h.state}</span><span className="flex flex-wrap gap-1.5">{h.accreditations.map((a) => <Badge key={a} tone="success">{a}</Badge>)}</span></Link></li>
          ))}
        </ul>
      </section>
      <section className="container-page">
        <div className="card space-y-2 p-5 text-sm text-fg-muted">
          <p><strong className="text-fg">{t("Please note")}</strong></p>
          <p>{t("Online consults with Indian doctors for patients outside India are limited to review of reports, planning and second opinions, unless the doctor is also licensed where you are. Your coordinator explains what's possible from your country.")}</p>
        </div>
      </section>
    </div>
  );
}
