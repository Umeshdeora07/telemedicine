import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CalendarClock, ClipboardList, Coins, FileSignature, Globe2, Plane, ShieldCheck, UserPlus, UserRoundCheck, Video } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getViewContext } from "@/server/context";
import { env } from "@/config/env";
import { brand } from "@/config/brand";
import { PHOTOS } from "@/config/images";
import { ButtonLink } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { CheckList, CtaBand, FeatureGrid, SectionHeading, StepList } from "@/components/marketing/blocks";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("For doctors"),
    description: t("For doctors registered in India in four specialties: Orthopaedics, Dermatology, General Physician and Psychology. Consult patients from India and around the world, on your own hours."),
  };
}

export default async function ForDoctors() {
  const { t } = await getViewContext();
  const specialties = [
    { photo: "orthopaedics" as const, name: t("Orthopaedics"), text: t("Orthopaedic surgeons for bones, joints, spine and sports injuries.") },
    { photo: "dermatology" as const, name: t("Dermatology"), text: t("Dermatologists for skin, hair and nails.") },
    { photo: "generalPhysician" as const, name: t("General Physician"), text: t("Physicians for everyday illness, diabetes, blood pressure, thyroid and check ups.") },
    { photo: "psychology" as const, name: t("Psychology"), text: t("Clinical psychologists for counselling and therapy, and psychiatrists for care that may need medicine.") },
  ];
  const points = [
    { Icon: CalendarClock, title: t("Your hours, your fees"), text: t("Set your online hours, consultation length and fees. Add clinic hours too if you see patients in person.") },
    { Icon: Globe2, title: t("Patients from India and abroad"), text: t("Patients in India, and people living in other countries who want a doctor registered in India, book with you by video.") },
    { Icon: Plane, title: t("Treatment in India requests"), text: t("Review reports from patients abroad who are planning treatment in India, and help them with a clear treatment plan.") },
    { Icon: FileSignature, title: t("Prescriptions done right"), text: t("Templates and quick buttons that follow the Telemedicine Practice Guidelines, 2020. Allergy and duplicate warnings are shown, and every prescription is digitally signed with a QR check.") },
    { Icon: Video, title: t("A calm consultation room"), text: t("The patient's health form, reports and history sit beside the video. Notes save automatically.") },
    { Icon: Coins, title: t("Paid every week"), text: t("Fees are released after each consultation and paid every Monday, with a clear statement. Platform commission is {p}%.", { p: Math.round(env.commissionRate * 100) }) },
  ];
  const steps = [
    { Icon: UserPlus, title: t("Create your account"), text: t("Log in with your email or your Google account.") },
    {
      Icon: ClipboardList,
      title: t("Fill in your details"),
      text: t("Add your qualifications, your Indian registration, a government photo ID, a photo of yourself, your fees and the times you are available."),
    },
    { Icon: ShieldCheck, title: t("Our team verifies you"), text: t("We check your registration on the official register and look at your documents. We call you if anything is unclear.") },
    { Icon: UserRoundCheck, title: t("Your profile goes live"), text: t("Patients can now see your profile and book you. We check your registration again every 12 months.") },
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
              › <span aria-current="page">{t("For doctors")}</span>
            </nav>
            <h1 id="title" className="text-[2rem] font-extrabold leading-tight sm:text-5xl">
              {t("Join {brand} as a doctor", { brand: brand.name })}
            </h1>
            <p className="max-w-xl text-lg text-fg sm:text-xl">
              {t("We invite doctors registered in India in four specialties, Orthopaedics, Dermatology, General Physician and Psychology, to consult patients from India and around the world.")}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/for-doctors/apply" size="lg">
                <BadgeCheck className="size-5" aria-hidden />
                {t("Join as a doctor")}
              </ButtonLink>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-card">
            <Photo photo="doctorCorridor" alt={t(PHOTOS.doctorCorridor.alt)} sizes="(min-width: 1024px) 40vw, 100vw" preload className="absolute inset-0" />
          </div>
        </div>
      </section>

      <section aria-labelledby="how" className="container-page space-y-6 py-12">
        <SectionHeading
          id="how"
          title={t("How to join, in 4 steps")}
          description={t("Your profile appears on the website only after our team has verified you.")}
        />
        <StepList steps={steps} />
        <ButtonLink href="/for-doctors/apply" size="lg">
          {t("Join as a doctor")}
        </ButtonLink>
      </section>

      <section aria-labelledby="specs" className="container-page space-y-6 pb-12">
        <SectionHeading id="specs" title={t("Specialties we are looking for")} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {specialties.map((s) => (
            <li key={s.name} className="card overflow-hidden">
              <div className="relative aspect-[16/10]">
                <Photo photo={s.photo} alt="" sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw" className="absolute inset-0" />
              </div>
              <div className="space-y-1 p-5">
                <h3 className="text-lg font-bold">{s.name}</h3>
                <p className="text-fg-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="why" className="bg-primary-soft">
        <div className="container-page space-y-6 py-12">
          <SectionHeading id="why" title={t("Why doctors join")} />
          <FeatureGrid items={points} />
        </div>
      </section>

      <section aria-labelledby="who" className="container-page py-12">
        <div className="max-w-3xl space-y-4">
          <SectionHeading id="who" title={t("Who can apply")} />
          <CheckList
            className="text-lg"
            items={[
              t("Doctors registered with the National Medical Commission or a State Medical Council."),
              t("Clinical psychologists registered with the Rehabilitation Council of India."),
              t("A valid degree in your specialty."),
              t("Willing to follow the Telemedicine Practice Guidelines, 2020."),
            ]}
          />
          <p className="flex items-start gap-2 text-fg-muted">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            {t("Patient identity and consent are confirmed in every consultation. Records are encrypted and every access is logged.")}
          </p>
        </div>
      </section>

      <CtaBand id="apply" title={t("Ready to join?")} text={t("Keep your registration certificate, degree certificates and a government photo ID ready before you start.")}>
        <ButtonLink href="/for-doctors/apply" size="lg" className="bg-on-primary text-primary shadow-sm hover:bg-on-primary/90">
          {t("Join as a doctor")}
        </ButtonLink>
      </CtaBand>
    </>
  );
}
