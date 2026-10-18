import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarCheck,
  Camera,
  CreditCard,
  FileText,
  Globe,
  Laptop,
  Lock,
  Pill,
  Receipt,
  Undo2,
  Video,
  Wifi,
} from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getViewContext } from "@/server/context";
import { getSpecialties } from "@/server/queries/reference";
import { PHOTOS } from "@/config/images";
import { ButtonLink } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { CheckList, CtaBand, FaqList, FeatureGrid, SectionHeading, StepList } from "@/components/marketing/blocks";
import { ContactButtons } from "@/components/marketing/contact";
import { siteSpecialties, startingPrice } from "@/components/marketing/specialty-content";
import { SpecialtyTiles } from "@/components/marketing/specialty-tiles";

const OUTSIDE_INDIA_NOTE =
  "Your doctor is registered in India. If you live outside India, a prescription from an Indian doctor may not be accepted by pharmacies in your country. Your doctor will give you a written treatment plan that you can share with your local doctor.";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("Online consultation with a doctor registered in India"),
    description: t(
      "Book a video consultation with a verified orthopaedic doctor, dermatologist, general physician or psychologist registered in India. See the price in your currency before you pay, and get a digital prescription or a written treatment plan.",
    ),
  };
}

export default async function OnlineConsultationPage() {
  const ctx = await getViewContext();
  const { t } = ctx;
  const specs = siteSpecialties(await getSpecialties());
  // Starting prices appear only once doctors with fees are listed.
  const hasPrices = specs.some((s) => startingPrice(ctx, s.startingFeeMinor));

  const faqs = [
    {
      q: t("Do I need to install an app?"),
      a: t("No. The video call opens in the web browser on your phone, tablet or laptop. Before you join, a quick check makes sure your camera and microphone work."),
    },
    {
      q: t("Can I consult a doctor from outside India?"),
      a: t("Yes. You can book a video consultation from any country. Your doctor is registered in India and consults under India's telemedicine rules."),
    },
    {
      q: t("Will a prescription from an Indian doctor work in my country?"),
      a: t(OUTSIDE_INDIA_NOTE),
    },
    {
      q: t("How much does a consultation cost?"),
      a: hasPrices
        ? t("Each doctor sets their own fee. The starting price for each specialty is shown on this page, and you see the full price in your currency before you pay.")
        : t("Each doctor sets their own fee, and you see the full price in your currency before you pay."),
    },
    {
      q: t("How do I pay?"),
      a: t("You pay securely online when you book. In India you can pay by UPI, card or net banking. From other countries you can pay by international card."),
    },
    {
      q: t("What happens if the doctor does not join?"),
      a: t("If your doctor does not join within 10 minutes of the start time, the consultation is cancelled and you get a full refund automatically."),
    },
    {
      q: t("Can I cancel or change my booking?"),
      a: t("Yes. You can change the time or cancel from your account. If you cancel before the cancellation deadline shown when you book, you get a full refund."),
    },
    {
      q: t("Is the video call private?"),
      a: t("Yes. Video calls are encrypted and are not recorded unless both you and your doctor agree. Your records are stored securely, and only the doctors you consult can see them."),
    },
    {
      q: t("Can I book for a family member?"),
      a: t("Yes. Add your family member from your profile, then book the consultation in their name. They join the video call themselves or with you."),
    },
  ];

  return (
    <>
      {/* Hero */}
      <section aria-labelledby="title" className="bg-primary-soft">
        <div className="container-page grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div className="min-w-0 space-y-5">
            <nav aria-label={t("Breadcrumb")} className="text-sm text-fg-muted">
              <Link href="/" className="hover:underline">
                {t("Home")}
              </Link>{" "}
              › <span aria-current="page">{t("Online consultation")}</span>
            </nav>
            <h1 id="title" className="text-[2rem] font-extrabold leading-tight sm:text-5xl">
              {t("See a verified Indian doctor by video, from wherever you are")}
            </h1>
            <p className="max-w-xl text-lg text-fg sm:text-xl">
              {t("Choose a specialist, pick a time and talk face to face on a private video call. You get a digital prescription or a written treatment plan, and a follow up chat for your questions.")}
            </p>
            <ul className="flex flex-wrap gap-2 text-sm font-semibold">
              {[
                { Icon: BadgeCheck, text: t("Doctors registered in India") },
                { Icon: Receipt, text: t("Price shown before you pay") },
                { Icon: Lock, text: t("Encrypted video calls") },
              ].map(({ Icon, text }) => (
                <li key={text} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-heading shadow-card">
                  <Icon className="size-4 text-primary" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/doctors" size="lg">
                <Video className="size-5" aria-hidden />
                {t("Choose a doctor")}
              </ButtonLink>
              <ButtonLink href="/help/callback" size="lg" variant="outline">
                {t("Request a call back")}
              </ButtonLink>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-card">
            <Photo photo="onlineDoctorAlt" alt={t(PHOTOS.onlineDoctorAlt.alt)} preload sizes="(min-width: 1024px) 32rem, 100vw" className="absolute inset-0" />
          </div>
        </div>
      </section>

      {/* Specialties and starting prices */}
      <section aria-labelledby="specs" className="container-page space-y-6 py-14">
        <SectionHeading
          id="specs"
          title={t("Choose a specialty")}
          description={
            hasPrices
              ? t("Each doctor sets their own fee. These are the starting prices, shown in your currency.")
              : t("Each doctor sets their own fee, and you see the full price in your currency before you pay.")
          }
        />
        <SpecialtyTiles specs={specs} ctx={ctx} />
      </section>

      {/* Steps */}
      <section aria-labelledby="steps" className="bg-surface py-14">
        <div className="container-page space-y-8">
          <SectionHeading id="steps" title={t("How it works")} description={t("Four simple steps, from booking to your follow up.")} />
          <StepList
            steps={[
              {
                Icon: CalendarCheck,
                title: t("Choose a doctor and a time"),
                text: t("Read each doctor's profile, with their experience, languages and fee, and pick a time that suits you."),
              },
              {
                Icon: CreditCard,
                title: t("Pay securely"),
                text: t("You see the full price in your currency before you pay. Then fill in a short health form so your doctor can prepare."),
              },
              {
                Icon: Video,
                title: t("Join the video call"),
                text: t("At your booked time, join the encrypted video call from your phone or laptop. No app is needed."),
              },
              {
                Icon: FileText,
                title: t("Get your prescription and follow up"),
                text: t("Your doctor sends a digital prescription or a written treatment plan. A follow up chat with your doctor for a few days is included, for any questions."),
              },
            ]}
          />
        </div>
      </section>

      {/* Prices and what to keep ready */}
      <div className="container-page grid gap-6 py-14 lg:grid-cols-2">
        <section aria-labelledby="prices" className="card space-y-4 p-6 sm:p-8">
          <h2 id="prices" className="text-2xl font-extrabold">
            {t("Clear prices and a refund promise")}
          </h2>
          <CheckList
            items={[
              t("You see the full price in your currency before you pay. Nothing is added later."),
              t("If your doctor does not join within 10 minutes of the start time, you get a full refund."),
              t("If you cancel before the cancellation deadline shown when you book, you get a full refund."),
              t("You receive an invoice for every payment in your account."),
            ]}
          />
          <p className="flex items-start gap-2 text-sm text-fg-muted">
            <Undo2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <Link href="/legal/refunds" className="font-semibold text-primary underline underline-offset-2">
              {t("Read our refund and cancellation policy")}
            </Link>
          </p>
        </section>
        <section aria-labelledby="ready" className="card space-y-4 p-6 sm:p-8">
          <h2 id="ready" className="text-2xl font-extrabold">
            {t("What to keep ready")}
          </h2>
          <ul className="space-y-3">
            {[
              { Icon: FileText, text: t("Your recent reports, scans and lab results, to upload before the call") },
              { Icon: Pill, text: t("The names and doses of the medicines you take now") },
              { Icon: Camera, text: t("Clear photos taken in daylight, if the problem is on your skin, hair or nails") },
              { Icon: Laptop, text: t("A phone or laptop with a working camera and microphone") },
              { Icon: Wifi, text: t("A quiet, private place with good light and a steady internet connection") },
            ].map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="size-5" />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Patients outside India */}
      <section aria-labelledby="abroad" className="container-page pb-14">
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-primary-soft p-6 sm:flex-row sm:p-8">
          <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface text-primary shadow-card">
            <Globe className="size-6" />
          </span>
          <div className="min-w-0 space-y-2">
            <h2 id="abroad" className="text-xl font-extrabold sm:text-2xl">
              {t("If you live outside India")}
            </h2>
            <p className="text-lg text-fg">{t(OUTSIDE_INDIA_NOTE)}</p>
            <p className="text-fg-muted">
              {t("If you need treatment that is not possible online, our team can help you plan your treatment in India.")}{" "}
              <Link href="/treatment-in-india" className="font-semibold text-primary underline underline-offset-2">
                {t("Treatment in India")}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Why book with us */}
      <section aria-labelledby="why" className="bg-surface py-14">
        <div className="container-page space-y-6">
          <SectionHeading id="why" title={t("Why book with us")} />
          <FeatureGrid
            items={[
              {
                Icon: BadgeCheck,
                title: t("Registration checked"),
                text: t("We check every doctor's registration with the National Medical Commission or a State Medical Council before they are listed, and again every 12 months. Psychologists are checked with the Rehabilitation Council of India."),
              },
              {
                Icon: Lock,
                title: t("Private and secure"),
                text: t("Video calls are encrypted and your records are stored securely. Only the doctors you consult can see them."),
              },
              {
                Icon: FileText,
                title: t("Your records in one place"),
                text: t("Your prescriptions, treatment plans, reports and invoices stay in your account, so you can share them with your local doctor."),
              },
            ]}
          />
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="container-page max-w-3xl space-y-6 py-14">
        <SectionHeading id="faq" title={t("Frequently asked questions")} />
        <FaqList items={faqs} />
        <p className="text-fg-muted">
          {t("Have another question?")}{" "}
          <Link href="/help" className="font-semibold text-primary underline underline-offset-2">
            {t("Visit the help centre")}
          </Link>
        </p>
      </section>

      <CtaBand id="cta" title={t("Ready to talk to a doctor?")} text={t("Choose a doctor and a time that suits you. You see the full price before you pay.")}>
        <ButtonLink href="/doctors" size="lg" className="bg-on-primary text-primary shadow-sm hover:bg-on-primary/90">
          {t("Choose a doctor")}
        </ButtonLink>
        <ContactButtons t={t} onBlue lead={false} />
      </CtaBand>
    </>
  );
}
