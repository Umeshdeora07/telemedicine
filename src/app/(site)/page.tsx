import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, CalendarCheck, ClipboardList, HeartHandshake, Lock, MessageSquareText, PhoneCall, Plane, ShieldCheck, Stethoscope, Undo2, Video } from "lucide-react";
import { getViewContext } from "@/server/context";
import { featuredDoctors } from "@/server/doctors";
import { getSpecialties } from "@/server/queries/reference";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/button";
import { SpecialtyIcon } from "@/components/ui/icon";
import { SearchBar } from "@/components/common/search-bar";
import { InstallPrompt } from "@/components/common/install-prompt";
import { DoctorCard } from "@/components/doctor/doctor-card";
import { HeroIllustration, GlobeIllustration, FamilyIllustration } from "@/components/illustrations/hero";
import { JsonLd } from "@/components/common/json-ld";

export default async function HomePage() {
  const ctx = await getViewContext();
  const { t } = ctx;
  const [specs, featured] = await Promise.all([getSpecialties(), featuredDoctors(6)]);
  const suggestions = [...new Set([...specs.map((s) => t(s.name)), ...specs.flatMap((s) => s.symptoms.map((x) => t(x)))])];

  const faqs = [
    [t("Are the doctors real and verified?"), t("Yes. Before any doctor goes live, our team checks their registration number with the State Medical Council or the National Medical Commission, their degrees and their ID. We re-check every 12 months. Each profile shows the date of the last check.")],
    [t("How much does a consult cost?"), t("Each doctor sets their fee. You see the fee, consult length and refund rules before you pay. Online consults usually start from ₹199.")],
    [t("What if the doctor doesn't join?"), t("If the doctor doesn't join within 10 minutes of your slot, you get a full refund automatically, and you can book another doctor at once.")],
    [t("Can I book for my parents if I live abroad?"), t("Yes. Add them as family members. Because they are in India, it is an India consult. You can join the same video call from any country and get the prescription and reminders on your phone too.")],
    [t("Will I get a prescription?"), t("If it is safe to treat you online, the doctor sends a signed e-prescription you can show at any pharmacy. Some medicines can only be prescribed in a video consult or in person, as India's telemedicine rules require.")],
    [t("Is my information private?"), t("Calls are encrypted. Recording is off unless both you and the doctor agree. Only doctors you consult can see your records, and you can share or stop sharing at any time.")],
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MedicalOrganization",
          name: brand.name,
          url: "/",
          medicalSpecialty: specs.map((s) => s.name),
        }}
      />
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-soft/60 to-page">
        <div className="container-page grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0 space-y-6">
            <h1 className="text-[2rem] font-extrabold leading-tight sm:text-5xl">{t("See a trusted doctor today — online or at the clinic")}</h1>
            <p className="max-w-xl text-lg text-fg-muted">
              {t("Video, audio or chat with verified doctors. Get an e-prescription, or a clinic visit when you need an examination. For you, and for your family in India from anywhere.")}
            </p>
            <SearchBar
              label={t("Search for a symptom, specialty, doctor or hospital")}
              placeholder={t("Fever, skin rash, heart doctor, hospital…")}
              submitLabel={t("Search")}
              suggestions={suggestions}
            />
            <div className="grid gap-3 sm:flex">
              <ButtonLink href="/consult-now" size="lg" className="w-full sm:w-auto">
                <Video className="size-5" aria-hidden />
                {t("Consult now")}
              </ButtonLink>
              <ButtonLink href="/doctors?mode=in_clinic" size="lg" variant="outline" className="w-full sm:w-auto">
                <Building2 className="size-5" aria-hidden />
                {t("Book clinic visit")}
              </ButtonLink>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[0.9375rem] text-fg-muted">
              <li className="flex items-center gap-1.5"><BadgeCheck className="size-5 text-primary" aria-hidden />{t("Licence-verified doctors")}</li>
              <li className="flex items-center gap-1.5"><Lock className="size-5 text-primary" aria-hidden />{t("Encrypted calls")}</li>
              <li className="flex items-center gap-1.5"><Undo2 className="size-5 text-primary" aria-hidden />{t("Refund if the doctor doesn't join")}</li>
            </ul>
          </div>
          <HeroIllustration className="mx-auto hidden w-full max-w-md lg:block" />
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-12" aria-labelledby="how">
        <h2 id="how" className="text-2xl font-extrabold sm:text-3xl">{t("How it works")}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { Icon: ClipboardList, title: t("1. Tell us what's wrong"), text: t("Search for a doctor, or answer a few questions and we suggest the right specialist and how soon to be seen.") },
            { Icon: Video, title: t("2. Talk to a verified doctor"), text: t("Pick video, audio or chat and a time that suits you. Family members can join the call from anywhere.") },
            { Icon: CalendarCheck, title: t("3. Get your plan"), text: t("A summary in simple words and an e-prescription. If you need an examination, book the clinic visit in one tap.") },
          ].map(({ Icon, title, text }) => (
            <li key={title} className="card p-5">
              <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-1 text-fg-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Specialties */}
      <section className="container-page py-6" aria-labelledby="specs">
        <div className="flex items-end justify-between gap-4">
          <h2 id="specs" className="text-2xl font-extrabold sm:text-3xl">{t("Top specialties")}</h2>
          <Link href="/specialties" className="tap inline-flex items-center gap-1 font-semibold text-primary">
            {t("See all")} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {specs.map((s) => (
            <li key={s.id}>
              <Link href={`/specialties/${s.slug}`} className="card flex h-full flex-col gap-2 p-4 transition hover:border-primary">
                <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <SpecialtyIcon name={s.icon} className="size-6" />
                </span>
                <span className="font-semibold text-heading">{t(s.name)}</span>
                <span className="text-sm text-fg-muted">
                  {t("From {price}", { price: ctx.fmt.money(ctx.priceFor([{ mode: "video", currency: "INR", amountMinor: s.startingFeeMinor }], "video")?.amountMinor ?? s.startingFeeMinor) })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="card mt-4 flex flex-col items-start gap-3 bg-accent-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold">{t("Not sure which doctor you need?")}</h3>
            <p className="text-fg-muted">{t("Answer a few quick questions. We'll suggest the right specialist and how soon to be seen. It never diagnoses.")}</p>
          </div>
          <ButtonLink href="/triage" variant="primary">
            <Stethoscope className="size-5" aria-hidden />
            {t("Check my symptoms")}
          </ButtonLink>
        </div>
      </section>

      {/* Featured doctors */}
      <section className="container-page py-12" aria-labelledby="featured">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="featured" className="text-2xl font-extrabold sm:text-3xl">{t("Featured verified doctors")}</h2>
            <p className="mt-1 text-fg-muted">{t("Times shown in your time zone ({zone}).", { zone: ctx.fmt.zone() })}</p>
          </div>
          <Link href="/doctors" className="tap hidden items-center gap-1 font-semibold text-primary sm:inline-flex">
            {t("All doctors")} <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((d) => (
            <DoctorCard key={d.id} d={d} ctx={ctx} />
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <section aria-labelledby="trust" className="bg-surface py-12">
        <div className="container-page">
          <h2 id="trust" className="text-2xl font-extrabold sm:text-3xl">{t("Care you can trust")}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: ShieldCheck, title: t("Verified doctors"), text: t("Registration checked with the medical council before going live, and every 12 months.") },
              { Icon: Lock, title: t("Encrypted and private"), text: t("Encrypted calls, records stored in India, recording only with consent.") },
              { Icon: Undo2, title: t("Refund promise"), text: t("Doctor doesn't join within 10 minutes? Full refund, automatically.") },
              { Icon: MessageSquareText, title: t("Someone to listen"), text: t("A named grievance officer, with replies within 24 hours.") },
            ].map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <Icon className="mt-1 size-7 shrink-0 text-primary" aria-hidden />
                <div>
                  <h3 className="font-bold">{title}</h3>
                  <p className="text-fg-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Family + international */}
      <section className="container-page grid gap-4 py-12 lg:grid-cols-2" aria-label={t("Care across borders")}>
        <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <FamilyIllustration className="w-40 shrink-0" />
          <div className="space-y-3">
            <h2 className="text-xl font-extrabold">{t("Caring for parents in India from abroad?")}</h2>
            <p className="text-fg-muted">{t("Book for them, join the video call from your country, and get their prescriptions and reminders on your phone too.")}</p>
            <ButtonLink href="/how-it-works#family" variant="secondary">
              <HeartHandshake className="size-5" aria-hidden />
              {t("How family care works")}
            </ButtonLink>
          </div>
        </div>
        <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <GlobeIllustration className="w-40 shrink-0" />
          <div className="space-y-3">
            <h2 className="text-xl font-extrabold">{t("Treatment in India for international patients")}</h2>
            <p className="text-fg-muted">{t("Send your reports, get a written treatment plan and cost estimate in your currency, visa letter, travel help and follow-up after you go home.")}</p>
            <ButtonLink href="/international" variant="secondary">
              <Plane className="size-5" aria-hidden />
              {t("Start an enquiry")}
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Help + app */}
      <section className="container-page grid gap-4 pb-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="card flex flex-col justify-between gap-4 p-6">
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold">{t("Need help booking?")}</h2>
            <p className="text-fg-muted">{t("Leave your number and a care coordinator will call you back in your language. Free, no obligation.")}</p>
          </div>
          <ButtonLink href="/help/callback" variant="outline">
            <PhoneCall className="size-5" aria-hidden />
            {t("Request a call back")}
          </ButtonLink>
        </div>
        <div className="card flex flex-col gap-4 bg-navy p-6 text-on-navy">
          <h2 className="text-xl font-extrabold text-on-navy">{t("Get the app — it works on slow networks too")}</h2>
          <p className="text-navy-muted">{t("Install {brand} on your home screen. It's light, opens fast, and keeps your visit passes and prescriptions handy.", { brand: brand.name })}</p>
          <InstallPrompt />
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page py-12" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-extrabold sm:text-3xl">{t("Frequently asked questions")}</h2>
        <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface">
          {faqs.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="tap flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-heading">
                {q}
                <span aria-hidden className="text-2xl text-primary transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-fg-muted">{a}</p>
            </details>
          ))}
        </div>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          }}
        />
      </section>
    </>
  );
}
