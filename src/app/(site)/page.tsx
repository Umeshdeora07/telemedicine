import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  FileText,
  Lock,
  MessageSquareText,
  Plane,
  Receipt,
  ShieldCheck,
  Star,
  Undo2,
  Video,
  type LucideIcon,
} from "lucide-react";
import { getDb } from "@/db";
import { doctors, reviews, specialties } from "@/db/schema";
import { getI18n } from "@/i18n/server";
import { getViewContext } from "@/server/context";
import { listDoctors, visibleDoctor } from "@/server/doctors";
import { getSpecialties } from "@/server/queries/reference";
import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { PHOTOS, type PhotoName } from "@/config/images";
import { ButtonLink } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { JsonLd } from "@/components/common/json-ld";
import { DoctorCard, loadQualificationLines } from "@/components/doctor/doctor-card";
import { CheckList, FaqList, SectionHeading, StepList } from "@/components/marketing/blocks";
import { ContactStrip, companyDetailsShown } from "@/components/marketing/contact";
import { TreatmentJourney } from "@/components/marketing/journeys";
import { siteSpecialties, startingPrice } from "@/components/marketing/specialty-content";
import { SpecialtyTiles } from "@/components/marketing/specialty-tiles";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { absolute: `${brand.name} | ${t("Online consultation and treatment in India")}` },
    description: t(
      "Video consultations with verified doctors registered in India, wherever you live. Or plan your treatment in India with a treatment plan, a cost estimate in your currency and help with your visa, travel and stay.",
    ),
  };
}

/** Published reviews from completed consultations with listed doctors: the newest few, one per doctor, no repeated text. */
async function recentReviews() {
  const db = await getDb();
  const rows = await db
    .select({
      id: reviews.id,
      author: reviews.authorDisplayName,
      rating: reviews.rating,
      text: reviews.text,
      doctorId: doctors.id,
      doctorName: doctors.fullName,
      specialtyName: specialties.name,
    })
    .from(reviews)
    .innerJoin(doctors, eq(doctors.id, reviews.doctorId))
    .innerJoin(specialties, eq(specialties.id, doctors.specialtyId))
    .where(and(eq(reviews.status, "published"), gte(reviews.rating, 4), sql`length(trim(${reviews.text})) >= 30`, visibleDoctor))
    .orderBy(desc(reviews.createdAt))
    .limit(40);
  const seenText = new Set<string>();
  const seenDoctor = new Set<string>();
  const out: typeof rows = [];
  for (const r of rows) {
    if (seenText.has(r.text) || seenDoctor.has(r.doctorId)) continue;
    seenText.add(r.text);
    seenDoctor.add(r.doctorId);
    out.push(r);
    if (out.length === 3) break;
  }
  return out;
}

function ServiceCard({
  photo,
  photoAlt,
  Icon,
  title,
  text,
  points,
  children,
}: {
  photo: PhotoName;
  photoAlt: string;
  Icon: LucideIcon;
  title: string;
  text: string;
  points: string[];
  children: ReactNode;
}) {
  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="relative aspect-[16/9]">
        <Photo photo={photo} alt={photoAlt} sizes="(min-width: 768px) 36rem, 100vw" className="absolute inset-0" />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Icon className="size-6" />
          </span>
          <h2 className="text-2xl font-extrabold">{title}</h2>
        </div>
        <p className="text-lg text-fg-muted">{text}</p>
        <CheckList items={points} />
        <div className="mt-auto flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">{children}</div>
      </div>
    </article>
  );
}

export default async function HomePage() {
  const ctx = await getViewContext();
  const { t } = ctx;
  const [specRows, rated, quotes] = await Promise.all([getSpecialties(), listDoctors(null, { sort: "rating", limit: 60 }), recentReviews()]);
  const specs = siteSpecialties(specRows);
  // One doctor per specialty, the highest rated first.
  const team = specs.flatMap((s) => rated.filter((d) => d.specialtySlug === s.slug).slice(0, 1));
  const quals = await loadQualificationLines(team.map((d) => d.id));
  const hasPrices = specs.some((s) => startingPrice(ctx, s.startingFeeMinor));

  const trust = [
    { Icon: BadgeCheck, title: t("Registration checked"), text: t("We check every doctor's registration with the National Medical Commission or a State Medical Council before they are listed, and again every 12 months. Psychologists are checked with the Rehabilitation Council of India.") },
    { Icon: Undo2, title: t("Refund promise"), text: t("If your doctor does not join within 10 minutes of the start time, you get a full refund.") },
    { Icon: Receipt, title: t("Clear prices"), text: t("You see the full price in your currency before you pay. Nothing is added later.") },
    { Icon: Lock, title: t("Secure records"), text: t("Video calls are encrypted and your records are stored securely. Only the doctors you consult can see them.") },
    {
      Icon: MessageSquareText,
      title: t("Someone to listen"),
      text: (
        <>
          {t("If something goes wrong, our grievance officer replies within 24 hours.")}{" "}
          <Link href="/legal/grievance" className="font-semibold text-primary underline underline-offset-2">
            {t("Contact the grievance officer")}
          </Link>
        </>
      ),
    },
    ...(companyDetailsShown()
      ? [{ Icon: Building2, title: t("A registered company"), text: t("Our company name, registered office and contact details are shown at the bottom of every page.") }]
      : []),
  ];

  const faqs = [
    {
      q: t("Can I consult a doctor from outside India?"),
      a: t("Yes. You can book a video consultation from any country. Your doctor is registered in India and consults under India's telemedicine rules."),
    },
    {
      q: t("Will a prescription from an Indian doctor work in my country?"),
      a: t("Your doctor is registered in India. If you live outside India, a prescription from an Indian doctor may not be accepted by pharmacies in your country. Your doctor will give you a written treatment plan that you can share with your local doctor."),
    },
    {
      q: t("How much does it cost, and how do I pay?"),
      a: t("Each doctor sets their own fee, and you see the full price in your currency before you book. You pay securely online. If the doctor does not join within 10 minutes, you get a full refund."),
    },
    {
      q: t("Is my information private?"),
      a: t("Yes. Video calls are encrypted and are not recorded unless both you and your doctor agree. Your records are stored securely, and only the doctors you consult can see them."),
    },
    {
      q: t("How do I start planning treatment in India?"),
      a: t("Send us your reports through the treatment plan form. A specialist reviews them, usually within 2 working days, and you receive a written treatment plan with a cost estimate in your currency. If you decide to travel, we help with your visa letter, travel and stay."),
    },
    {
      q: t("Which languages do the doctors speak?"),
      a: t("Each doctor's profile shows the languages they speak, such as English, Hindi and other Indian languages. This website is available in English and Hindi, and for treatment in India an interpreter can be arranged on request."),
    },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MedicalOrganization",
          name: brand.name,
          url: env.appUrl,
          medicalSpecialty: specs.map((s) => s.name),
        }}
      />

      {/* 1. Hero and the two services */}
      <section aria-labelledby="hero" className="bg-primary-soft">
        <div className="container-page grid items-center gap-8 pb-24 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-32">
          <div className="min-w-0 space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-sm font-semibold text-primary shadow-card">
              <BadgeCheck className="size-4" aria-hidden />
              {t("Doctors registered in India")}
            </p>
            <h1 id="hero" className="text-[2rem] font-extrabold leading-tight sm:text-5xl">
              {t("Online consultation and treatment in India")}
            </h1>
            <p className="max-w-xl text-lg text-fg sm:text-xl">
              {t("Talk to a verified specialist by video from your home, wherever you live. Or come to India for treatment, with a team that helps you at every step.")}
            </p>
          </div>
          <div className="relative hidden lg:block">
            <div className="relative aspect-[5/4] overflow-hidden rounded-3xl shadow-card">
              <Photo photo="onlineDoctor" alt={t(PHOTOS.onlineDoctor.alt)} preload sizes="(min-width: 1024px) 34rem, 1px" className="absolute inset-0" />
            </div>
            <p className="absolute -bottom-5 start-6 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-card">
              <span aria-hidden className="grid size-10 place-items-center rounded-full bg-success-soft text-success">
                <ShieldCheck className="size-5" />
              </span>
              <span className="text-sm">
                <strong className="block text-heading">{t("Encrypted video calls")}</strong>
                <span className="text-fg-muted">{t("Private between you and your doctor")}</span>
              </span>
            </p>
          </div>
        </div>
      </section>
      <div className="container-page relative -mt-16 grid gap-5 md:grid-cols-2 lg:-mt-20">
        <ServiceCard
          photo="patientAtHome"
          photoAlt={t(PHOTOS.patientAtHome.alt)}
          Icon={Video}
          title={t("Online consultation")}
          text={t("A video call with a verified specialist registered in India, a digital prescription and a follow up chat.")}
          points={[t("Choose your doctor and a time that suits you"), t("See the price in your currency before you pay"), t("Join from your phone or laptop")]}
        >
          <ButtonLink href="/doctors" size="lg" className="w-full whitespace-normal sm:w-auto">
            {t("Book a consultation")}
          </ButtonLink>
          <ButtonLink href="/online-consultation" size="lg" variant="outline" className="w-full whitespace-normal sm:w-auto">
            {t("How it works")}
          </ButtonLink>
        </ServiceCard>
        <ServiceCard
          photo="medicalTeam"
          photoAlt={t(PHOTOS.medicalTeam.alt)}
          Icon={Plane}
          title={t("Treatment in India")}
          text={t("Send your reports and get a treatment plan and cost estimate. We help with your visa letter, travel and stay.")}
          points={[t("A specialist reviews your reports"), t("Cost estimate in your currency"), t("Visa letter, airport pickup and a stay near the hospital")]}
        >
          <ButtonLink href="/treatment-in-india" size="lg" className="w-full whitespace-normal sm:w-auto">
            {t("Get a treatment plan")}
          </ButtonLink>
        </ServiceCard>
      </div>

      {/* 2. Trust bar */}
      <section aria-label={t("Our promises")} className="container-page pt-10">
        <ul className="grid gap-x-6 gap-y-4 rounded-2xl border border-line bg-surface px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: ShieldCheck, text: t("Verified doctors registered in India") },
            { Icon: Lock, text: t("Encrypted video calls") },
            { Icon: Receipt, text: t("Price shown before you pay") },
            { Icon: Undo2, text: t("Full refund if the doctor does not join") },
          ].map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-3 font-semibold text-heading">
              <Icon className="size-6 shrink-0 text-primary" aria-hidden />
              {text}
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Specialties */}
      <section aria-labelledby="specs" className="container-page space-y-6 py-14">
        <SectionHeading
          id="specs"
          title={t("Our specialties")}
          description={hasPrices ? t("Choose the care you need. Prices are shown in your currency.") : t("Choose the care you need.")}
          action={
            <Link href="/specialties" className="tap inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              {t("About our specialties")} <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />
        <SpecialtyTiles specs={specs} ctx={ctx} />
      </section>

      {/* 4. How online consultation works */}
      <section aria-labelledby="online-steps" className="bg-surface py-14">
        <div className="container-page space-y-8">
          <SectionHeading
            id="online-steps"
            title={t("How online consultation works")}
            description={t("Three simple steps, from booking to your treatment plan.")}
          />
          <StepList
            steps={[
              { Icon: CalendarCheck, title: t("Choose a doctor and a time"), text: t("Compare doctors by experience, languages and fee, then pick a time that suits you.") },
              { Icon: Video, title: t("Pay and join the video call"), text: t("Pay securely online. At your booked time, join the encrypted video call from your phone or laptop.") },
              { Icon: FileText, title: t("Get your prescription or plan"), text: t("Receive a digital prescription or a written treatment plan, and a follow up chat for your questions.") },
            ]}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/doctors" size="lg">
              {t("Book a consultation")}
            </ButtonLink>
            <ButtonLink href="/online-consultation" size="lg" variant="outline">
              {t("Learn about online consultation")}
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* 5. How treatment in India works */}
      <section aria-labelledby="india-steps" className="container-page py-14">
        <TreatmentJourney
          t={t}
          id="india-steps"
          title={t("How treatment in India works")}
          description={t("From your first message to your follow up at home, one team helps you at every step.")}
          actions={
            <>
              <ButtonLink href="/treatment-in-india" size="lg" className="whitespace-normal">
                {t("Get a treatment plan")}
              </ButtonLink>
              <ButtonLink href="/help/callback?reason=international" size="lg" variant="outline">
                {t("Talk to us")}
              </ButtonLink>
            </>
          }
        />
      </section>

      {/* 6. Doctors */}
      {team.length ? (
        <section aria-labelledby="doctors" className="bg-primary-soft py-14">
          <div className="container-page space-y-6">
            <SectionHeading
              id="doctors"
              title={t("Meet our doctors")}
              description={t("Every doctor's registration is checked before they are listed, and again every 12 months.")}
              action={
                <Link href="/doctors" className="tap inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                  {t("See all doctors")} <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            />
            <div className="grid gap-4 md:grid-cols-2">
              {team.map((d) => (
                <DoctorCard key={d.id} d={d} ctx={ctx} qualifications={quals.get(d.id) ?? ""} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 7. Trust */}
      <section aria-labelledby="trust" className="container-page space-y-8 py-14">
        <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div className="relative hidden aspect-[4/5] overflow-hidden rounded-3xl shadow-card lg:block">
            <Photo photo="doctorCorridor" alt={t(PHOTOS.doctorCorridor.alt)} sizes="(min-width: 1024px) 26rem, 1px" className="absolute inset-0" />
          </div>
          <div className="min-w-0 space-y-6">
            <SectionHeading id="trust" title={t("Why patients trust us")} description={t("What we promise, and what we do to keep that promise.")} />
            <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {trust.map(({ Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold">{title}</h3>
                    <p className="mt-1 text-fg-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {quotes.length ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold">{t("What patients say")}</h3>
              <p className="text-fg-muted">{t("Reviews are written by patients after a completed consultation.")}</p>
            </div>
            <ul className="grid gap-4 md:grid-cols-3">
              {quotes.map((r) => (
                <li key={r.id} className="card flex flex-col gap-3 p-5">
                  <p className="flex gap-0.5" role="img" aria-label={t("Rated {rating} out of 5", { rating: r.rating })}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={i < r.rating ? "size-4 fill-accent text-accent" : "size-4 text-line"} aria-hidden />
                    ))}
                  </p>
                  <blockquote className="flex-1 text-fg">“{r.text}”</blockquote>
                  <p className="text-sm">
                    <span className="block font-semibold text-heading">{r.author}</span>
                    <span className="text-fg-muted">{t("Consulted {doctor}, {specialty}", { doctor: r.doctorName, specialty: t(r.specialtyName) })}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* 8. FAQ */}
      <section aria-labelledby="faq" className="bg-surface py-14">
        <div className="container-page max-w-3xl space-y-6">
          <SectionHeading id="faq" title={t("Frequently asked questions")} />
          <FaqList items={faqs} />
          <p className="text-fg-muted">
            {t("Have another question?")}{" "}
            <Link href="/help" className="font-semibold text-primary underline underline-offset-2">
              {t("Visit the help centre")}
            </Link>
          </p>
        </div>
      </section>

      {/* 9. Contact */}
      <ContactStrip t={t} />
    </>
  );
}
