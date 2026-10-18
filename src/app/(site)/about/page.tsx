import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, FileCheck2, Lock, Plane, RefreshCw, Video } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getViewContext } from "@/server/context";
import { brand } from "@/config/brand";
import { PHOTOS } from "@/config/images";
import { ButtonLink } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { CheckList, CtaBand, SectionHeading, StepList } from "@/components/marketing/blocks";
import { CompanyDetails } from "@/components/support/company-details";
import { hasCompanyDetails } from "@/components/support/brand-info";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("About us"),
    description: t("We connect patients around the world with trusted doctors in India, for online consultations and for treatment in India."),
  };
}

export default async function About() {
  const { t } = await getViewContext();
  const checks = [
    {
      Icon: BadgeCheck,
      title: t("Registration checked"),
      text: t("We check each doctor's registration on the official register of the National Medical Commission or their State Medical Council. Clinical psychologists must be registered with the Rehabilitation Council of India."),
    },
    {
      Icon: FileCheck2,
      title: t("Degrees and identity checked"),
      text: t("We check their degree certificates and a government photo ID, and we call them if anything is unclear."),
    },
    {
      Icon: RefreshCw,
      title: t("Checked again every year"),
      text: t("A doctor is listed only after these checks. We check every registration again every 12 months, and a doctor whose registration lapses is removed from the site."),
    },
  ];
  return (
    <>
      <section aria-labelledby="title" className="bg-primary-soft">
        <div className="container-page grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div className="min-w-0 space-y-5">
            <nav aria-label={t("Breadcrumb")} className="text-sm text-fg-muted">
              <Link href="/" className="hover:underline">
                {t("Home")}
              </Link>{" "}
              › <span aria-current="page">{t("About us")}</span>
            </nav>
            <h1 id="title" className="text-[2rem] font-extrabold leading-tight sm:text-5xl">
              {t("About {brand}", { brand: brand.name })}
            </h1>
            <p className="max-w-xl text-lg text-fg sm:text-xl">
              {t("Our mission is to connect patients around the world with trusted doctors in India.")}
            </p>
            <p className="max-w-xl text-fg-muted">
              {t("Good doctors exist, but reaching the right one can be hard, especially when you live far away. We make it simple to see a verified doctor online, and to plan treatment in India with a clear plan and price.")}
            </p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-card">
            <Photo photo="medicalTeam" alt={t(PHOTOS.medicalTeam.alt)} sizes="(min-width: 1024px) 40vw, 100vw" preload className="absolute inset-0" />
          </div>
        </div>
      </section>

      <section aria-labelledby="what" className="container-page space-y-6 py-12">
        <SectionHeading id="what" title={t("What we do")} />
        <ul className="grid gap-4 md:grid-cols-2">
          <li className="card flex flex-col gap-3 p-6">
            <span aria-hidden className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
              <Video className="size-6" />
            </span>
            <h3 className="text-xl font-bold">{t("Online consultation")}</h3>
            <p className="text-fg-muted">
              {t("See a doctor registered in India on a private video call, wherever you live. Choose from Orthopaedics, Dermatology, General Physician and Psychology. You get a digital prescription or a written treatment plan.")}
            </p>
            <Link href="/online-consultation" className="tap mt-auto inline-flex items-center font-semibold text-primary">
              {t("How online consultation works")}
            </Link>
          </li>
          <li className="card flex flex-col gap-3 p-6">
            <span aria-hidden className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
              <Plane className="size-6" />
            </span>
            <h3 className="text-xl font-bold">{t("Treatment in India")}</h3>
            <p className="text-fg-muted">
              {t("Send your reports and a specialist reviews them. You get a written treatment plan and cost estimate, help choosing a hospital, a medical visa letter, and a coordinator by your side until you are back home.")}
            </p>
            <Link href="/treatment-in-india" className="tap mt-auto inline-flex items-center font-semibold text-primary">
              {t("How treatment in India works")}
            </Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="checks" className="bg-primary-soft">
        <div className="container-page space-y-6 py-12">
          <SectionHeading id="checks" title={t("How we check doctors")} description={t("Every doctor on {brand} is registered in India and verified by our team before they can see patients.", { brand: brand.name })} />
          <StepList steps={checks} />
        </div>
      </section>

      <section aria-labelledby="promise" className="container-page grid gap-8 py-12 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionHeading id="promise" title={t("What we promise")} />
          <CheckList
            className="text-lg"
            items={[
              t("Every doctor is verified and registered in India."),
              t("You see the full price before you pay."),
              t("If your doctor does not join within 10 minutes, you get a full refund automatically."),
              t("Video calls are encrypted, and your records are stored securely."),
              t("Your records are yours. You decide who can see them."),
              t("A named grievance officer replies to every complaint within 24 hours."),
            ]}
          />
        </div>
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-2xl font-extrabold sm:text-3xl">
            <Lock className="size-6 text-primary" aria-hidden />
            {t("How we follow the rules")}
          </h2>
          <p className="text-lg text-fg-muted">
            {t("Online consultations follow India's Telemedicine Practice Guidelines, 2020. We protect personal data under India's Digital Personal Data Protection Act, 2023.")}
          </p>
          <p className="text-lg text-fg-muted">
            {t("Your doctor is registered in India. If you live outside India, a prescription from an Indian doctor may not be accepted by pharmacies in your country. Your doctor will give you a written treatment plan that you can share with your local doctor.")}
          </p>
          <p>
            <Link href="/legal/terms" className="font-semibold text-primary underline">
              {t("Terms of use")}
            </Link>
            {" · "}
            <Link href="/legal/privacy" className="font-semibold text-primary underline">
              {t("Privacy policy")}
            </Link>
          </p>
        </div>
      </section>

      {hasCompanyDetails() ? (
        <section aria-labelledby="company" className="container-page space-y-4 pb-4">
          <h2 id="company" className="text-2xl font-extrabold">
            {t("Company details")}
          </h2>
          <CompanyDetails t={t} />
        </section>
      ) : null}

      <CtaBand id="start" title={t("Ready when you are")} text={t("Book an online consultation, or send your reports for a treatment plan in India.")}>
        <ButtonLink href="/doctors" size="lg" className="bg-on-primary text-primary shadow-sm hover:bg-on-primary/90">
          {t("Book a consultation")}
        </ButtonLink>
        <ButtonLink href="/treatment-in-india" size="lg" variant="outline" className="border border-on-primary/70 bg-transparent text-on-primary hover:bg-on-primary/10">
          {t("Get a treatment plan")}
        </ButtonLink>
      </CtaBand>
    </>
  );
}
