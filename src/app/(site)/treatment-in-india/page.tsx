import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardList,
  ExternalLink,
  FileSearch,
  HeartHandshake,
  Hotel,
  Languages,
  MessageCircle,
  PhoneCall,
  Plane,
  Stamp,
  Video,
  Wallet,
} from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getViewContext } from "@/server/context";
import { getSpecialties } from "@/server/queries/reference";
import { PHOTOS, type PhotoName } from "@/config/images";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { CheckList, CtaBand, FaqList, FeatureGrid, SectionHeading } from "@/components/marketing/blocks";
import { contactLabel, whatsappLink } from "@/components/marketing/contact";
import { TreatmentJourney } from "@/components/marketing/journeys";
import { siteSpecialties, specialtyCopy, type SpecialtySlug } from "@/components/marketing/specialty-content";

/** India's official e-Visa website, where visitors confirm the medical visa rules. */
const INDIAN_VISA_SITE = "https://indianvisaonline.gov.in/evisa/";

/** Photos for the specialty cards on this page (the orthopaedics one shows an X-ray review). */
const TREATMENT_PHOTO: Record<SpecialtySlug, PhotoName> = {
  orthopaedics: "orthopaedicsAlt",
  dermatology: "dermatology",
  "general-physician": "generalPhysician",
  psychology: "psychology",
};

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("Treatment in India: free treatment plan and cost estimate"),
    description: t(
      "Send your reports for a free review by a specialist in India. Get a written treatment plan and a cost estimate in your currency, and help with your medical visa letter, travel, stay and follow up from home.",
    ),
  };
}

export default async function TreatmentInIndiaPage() {
  const ctx = await getViewContext();
  const { t } = ctx;
  const specs = siteSpecialties(await getSpecialties());
  const copy = specialtyCopy(t);
  const startHref = ctx.user ? "/international/new" : `/login?next=${encodeURIComponent("/international/new")}`;
  const callbackHref = "/help/callback?reason=international";
  const whatsapp = whatsappLink();

  const help = [
    {
      Icon: FileSearch,
      title: t("Free review of your reports"),
      text: t("A specialist reads your reports and replies, usually within 2 working days."),
    },
    {
      Icon: ClipboardList,
      title: t("Treatment plan and cost estimate"),
      text: t("A written plan that explains the treatment, how long you may need to stay in India and what it may cost, in your currency."),
    },
    {
      Icon: Building2,
      title: t("Help choosing a hospital"),
      text: t("We help you choose a hospital that suits your treatment and budget. You can check its accreditation, such as NABH or JCI, yourself."),
    },
    {
      Icon: Stamp,
      title: t("Medical visa letter"),
      text: t("An invitation letter for India's e-Medical visa, and for the e-Medical Attendant visa if family members travel with you."),
    },
    {
      Icon: Plane,
      title: t("Airport pickup"),
      text: t("Someone meets you at the airport when you arrive and takes you to your stay."),
    },
    {
      Icon: Hotel,
      title: t("A stay near the hospital"),
      text: t("We help you find a comfortable place to stay close to the hospital, for you and your family."),
    },
    {
      Icon: Languages,
      title: t("Interpreter on request"),
      text: t("If you prefer to speak in your own language, ask us and we will arrange an interpreter."),
    },
    {
      Icon: HeartHandshake,
      title: t("A coordinator by your side"),
      text: t("One person who answers your questions and helps you from your first message until you are back home."),
    },
    {
      Icon: Video,
      title: t("Follow up from home"),
      text: t("After you return home, you can have online follow up consultations with your doctor."),
    },
  ];

  const faqs = [
    {
      q: t("How do I start?"),
      a: t("Select \"Get a free treatment plan\", tell us about the health problem and upload your reports. You need to sign in first, so that your reports stay private in your account."),
    },
    {
      q: t("Is the treatment plan really free?"),
      a: t("Yes. The review of your reports, the treatment plan and the cost estimate are free. You decide afterwards whether you want to go ahead."),
    },
    {
      q: t("How long does the review take?"),
      a: t("A specialist usually replies within 2 working days. If they need more reports or tests, we will tell you which ones."),
    },
    {
      q: t("Which hospital will treat me?"),
      a: t("We help you choose a hospital that suits your treatment and budget, and the treatment plan names it. You can check its accreditation, such as NABH or JCI, yourself before you decide."),
    },
    {
      q: t("Can my family travel with me?"),
      a: t("Yes. Up to two family members can be named in the invitation letter, so that they can apply for India's e-Medical Attendant visa."),
    },
    {
      q: t("Can I talk to a doctor before I decide?"),
      a: t("Yes. You can book an online consultation with one of our doctors to talk about your reports and your treatment options before you travel."),
    },
    {
      q: t("How do I pay for the treatment?"),
      a: t("You pay the hospital directly, or as agreed in your treatment plan. The cost estimate shows what is included, so there are no hidden fees."),
    },
    {
      q: t("What happens after I go home?"),
      a: t("You can have online follow up consultations with your doctor, and your reports, discharge papers and prescriptions stay in your account."),
    },
  ];

  const startButton = (
    <ButtonLink href={startHref} size="lg" className="whitespace-normal">
      {t("Get a free treatment plan")}
      <ArrowRight className="size-5" aria-hidden />
    </ButtonLink>
  );

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
              › <span aria-current="page">{t("Treatment in India")}</span>
            </nav>
            <h1 id="title" className="text-[2rem] font-extrabold leading-tight sm:text-5xl">
              {t("Plan your treatment in India, with a team by your side")}
            </h1>
            <p className="max-w-xl text-lg text-fg sm:text-xl">
              {t("Send your reports for a free review by a specialist. You get a written treatment plan and a cost estimate in your currency, and help with your visa, travel and stay.")}
            </p>
            <ul className="flex flex-wrap gap-2 text-sm font-semibold">
              {[
                { Icon: FileSearch, text: t("Free review of your reports") },
                { Icon: Wallet, text: t("Cost estimate in your currency") },
                { Icon: Stamp, text: t("Medical visa letter") },
              ].map(({ Icon, text }) => (
                <li key={text} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-heading shadow-card">
                  <Icon className="size-4 text-primary" aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {startButton}
              <ButtonLink href={callbackHref} size="lg" variant="outline">
                <PhoneCall className="size-5" aria-hidden />
                {t("Talk to us")}
              </ButtonLink>
              {whatsapp ? (
                <a href={whatsapp.href} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "lg")}>
                  <MessageCircle className="size-5" aria-hidden />
                  {contactLabel(t, whatsapp)}
                </a>
              ) : null}
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-card">
            <Photo photo="hospitalCorridor" alt={t(PHOTOS.hospitalCorridor.alt)} preload sizes="(min-width: 1024px) 32rem, 100vw" className="absolute inset-0" />
          </div>
        </div>
      </section>

      {/* What we help with */}
      <section aria-labelledby="help" className="container-page space-y-6 py-14">
        <SectionHeading
          id="help"
          title={t("What we help with")}
          description={t("From the first look at your reports to your follow up at home, you deal with one team.")}
        />
        <FeatureGrid items={help} />
      </section>

      {/* Specialties and typical treatments */}
      <section aria-labelledby="treatments" className="bg-surface py-14">
        <div className="container-page space-y-6">
          <SectionHeading
            id="treatments"
            title={t("Treatments we can help you plan")}
            description={t("Our specialists review your reports in these four areas.")}
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {specs.map((s) => {
              const name = t(s.name);
              return (
                <li key={s.id} className="card flex flex-col overflow-hidden">
                  <div className="relative aspect-[3/2]">
                    <Photo photo={TREATMENT_PHOTO[s.slug]} alt="" sizes="(min-width: 1024px) 18rem, (min-width: 640px) 50vw, 100vw" className="absolute inset-0" />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <h3 className="text-xl font-bold">{name}</h3>
                    <CheckList items={copy[s.slug].inIndia} />
                    <Link
                      href={`/specialties/${s.slug}`}
                      className="tap mt-auto inline-flex items-center gap-1 self-start font-semibold text-primary hover:underline"
                      aria-label={t("Learn more about {specialty}", { specialty: name })}
                    >
                      {t("Learn more")} <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Journey */}
      <section aria-labelledby="journey" className="container-page py-14">
        <TreatmentJourney
          t={t}
          id="journey"
          title={t("Your journey, step by step")}
          description={t("You decide at every step. Nothing is booked until you say yes.")}
          actions={startButton}
        />
      </section>

      {/* Visa and costs */}
      <div className="container-page grid gap-6 pb-14 lg:grid-cols-2">
        <section aria-labelledby="visa" className="card space-y-4 p-6 sm:p-8">
          <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Stamp className="size-6" />
          </span>
          <h2 id="visa" className="text-2xl font-extrabold">
            {t("Your medical visa")}
          </h2>
          <p className="text-fg">
            {t("Patients who travel to India for treatment apply for India's e-Medical visa. Family members who travel with you apply for the e-Medical Attendant visa.")}
          </p>
          <CheckList
            items={[
              t("When you accept your treatment plan, the hospital gives you an invitation letter for your visa application."),
              t("Up to two family members who travel with you can be named in the letter."),
              t("Your treatment plan lists the documents you need to bring."),
            ]}
          />
          <p className="rounded-xl bg-surface-2 p-4 text-fg-muted">
            {t("Visa rules, fees and processing times can change. Please check the latest details on the official Indian visa website before you apply.")}{" "}
            <a href={INDIAN_VISA_SITE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2">
              {t("Official Indian visa website")}
              <ExternalLink className="size-4" aria-hidden />
              <span className="sr-only">{t("(opens in a new tab)")}</span>
            </a>
          </p>
        </section>
        <section aria-labelledby="cost" className="card space-y-4 p-6 sm:p-8">
          <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Wallet className="size-6" />
          </span>
          <h2 id="cost" className="text-2xl font-extrabold">
            {t("What it costs")}
          </h2>
          <p className="text-fg">{t("You know what to expect before you travel.")}</p>
          <CheckList
            items={[
              t("The review of your reports and your treatment plan are free."),
              t("You receive a cost estimate in your currency before you travel."),
              t("The estimate shows what is included, so there are no hidden fees."),
              t("You pay the hospital directly, or as agreed in your treatment plan."),
            ]}
          />
        </section>
      </div>

      {/* Trust */}
      <section aria-labelledby="trust" className="bg-primary-soft py-14">
        <div className="container-page grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-card">
            <Photo photo="medicalTeam" alt={t(PHOTOS.medicalTeam.alt)} sizes="(min-width: 1024px) 28rem, 100vw" className="absolute inset-0" />
          </div>
          <div className="min-w-0 space-y-5">
            <SectionHeading id="trust" title={t("Doctors you can check")} />
            <ul className="space-y-4">
              {[
                t("Our doctors are registered in India. We check each doctor's registration before they are listed, and again every 12 months."),
                t("Your reports are stored securely, and only the team working on your plan can see them."),
                t("You can talk to one of our doctors by video before you decide to travel."),
              ].map((text) => (
                <li key={text} className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
                  <span className="text-lg">{text}</span>
                </li>
              ))}
            </ul>
            <ButtonLink href="/doctors" variant="outline" size="lg">
              {t("See our doctors")}
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="container-page max-w-3xl space-y-6 py-14">
        <SectionHeading id="faq" title={t("Frequently asked questions")} />
        <FaqList items={faqs} />
      </section>

      <CtaBand
        id="cta"
        title={t("Get your free treatment plan")}
        text={t("Send your reports today. A specialist usually replies within 2 working days.")}
      >
        <ButtonLink href={startHref} size="lg" className="whitespace-normal bg-on-primary text-primary shadow-sm hover:bg-on-primary/90">
          {t("Get a free treatment plan")}
        </ButtonLink>
        <ButtonLink href={callbackHref} size="lg" variant="outline" className="border-on-primary/70 bg-transparent text-on-primary hover:bg-on-primary/10">
          <PhoneCall className="size-5" aria-hidden />
          {t("Talk to us")}
        </ButtonLink>
        {whatsapp ? (
          <a
            href={whatsapp.href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("outline", "lg", "border-on-primary/70 bg-transparent text-on-primary hover:bg-on-primary/10")}
          >
            <MessageCircle className="size-5" aria-hidden />
            {contactLabel(t, whatsapp)}
          </a>
        ) : null}
      </CtaBand>
    </>
  );
}
