import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { ArrowRight, BadgeCheck, Plane, Video } from "lucide-react";
import { getDb } from "@/db";
import { doctors, specialties } from "@/db/schema";
import { getI18n } from "@/i18n/server";
import { getViewContext } from "@/server/context";
import { listDoctors } from "@/server/doctors";
import { PHOTOS } from "@/config/images";
import { ButtonLink } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { DoctorCard, loadQualificationLines } from "@/components/doctor/doctor-card";
import { CheckList, CtaBand, FaqList, SectionHeading } from "@/components/marketing/blocks";
import { ContactButtons } from "@/components/marketing/contact";
import { SPECIALTY_PHOTO, isSpecialtySlug, specialtyCopy, startingPrice } from "@/components/marketing/specialty-content";

/** One of the four specialties, or null (also for rows of removed specialties an older database may hold). */
const load = cache(async (slug: string) => {
  if (!isSpecialtySlug(slug)) return null;
  const db = await getDb();
  const [s] = await db.select().from(specialties).where(eq(specialties.slug, slug));
  return s ? { ...s, slug } : null;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await load((await params).slug);
  if (!s) return {};
  const { t } = await getI18n();
  return {
    title: t("{specialty}: consult a doctor online", { specialty: t(s.name) }),
    description: t(s.shortDescription),
  };
}

export default async function SpecialtyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await load(slug);
  if (!s) notFound();
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const db = await getDb();
  const [docs, [reviewer]] = await Promise.all([
    listDoctors(null, { specialty: s.slug, sort: "soonest", limit: 6 }),
    s.reviewedByDoctorId
      ? db.select({ fullName: doctors.fullName, slug: doctors.slug }).from(doctors).where(eq(doctors.id, s.reviewedByDoctorId))
      : Promise.resolve([]),
  ]);
  const quals = await loadQualificationLines(docs.map((d) => d.id));
  const name = t(s.name);
  const copy = specialtyCopy(t)[s.slug];
  const price = startingPrice(ctx, s.startingFeeMinor);
  const photo = SPECIALTY_PHOTO[s.slug];
  const doctorsHref = `/doctors?specialty=${s.slug}`;

  const faqs = [
    ...s.faqs.map((f) => ({ q: t(f.q), a: t(f.a) })),
    ...(s.faqs.some((f) => f.q === "I live outside India. Can I still consult?")
      ? []
      : [
          {
            q: t("Will a prescription from an Indian doctor work in my country?"),
            a: t("Your doctor is registered in India. If you live outside India, a prescription from an Indian doctor may not be accepted by pharmacies in your country. Your doctor will give you a written treatment plan that you can share with your local doctor."),
          },
        ]),
  ];

  return (
    <>
      {/* Photo header */}
      <section aria-labelledby="title" className="bg-primary-soft">
        <div className="container-page grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div className="min-w-0 space-y-5">
            <nav aria-label={t("Breadcrumb")} className="text-sm text-fg-muted">
              <Link href="/" className="hover:underline">
                {t("Home")}
              </Link>{" "}
              ›{" "}
              <Link href="/specialties" className="hover:underline">
                {t("Specialties")}
              </Link>{" "}
              › <span aria-current="page">{name}</span>
            </nav>
            <h1 id="title" className="text-[2rem] font-extrabold leading-tight sm:text-5xl">
              {name}
            </h1>
            <p className="max-w-xl text-lg text-fg sm:text-xl">{t(s.shortDescription)}</p>
            <ul className="flex flex-wrap gap-2 text-sm font-semibold">
              {price ? (
                <li className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-heading shadow-card">
                  <Video className="size-4 text-primary" aria-hidden />
                  {price}
                </li>
              ) : null}
              <li className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-heading shadow-card">
                <BadgeCheck className="size-4 text-primary" aria-hidden />
                {t("Doctors registered in India")}
              </li>
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row">
              {docs.length ? (
                <ButtonLink href={doctorsHref} size="lg">
                  <Video className="size-5" aria-hidden />
                  {t("Book a consultation")}
                </ButtonLink>
              ) : null}
              <ButtonLink href="/online-consultation" size="lg" variant={docs.length ? "outline" : "primary"}>
                {t("How online consultation works")}
              </ButtonLink>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-card">
            <Photo photo={photo} alt={t(PHOTOS[photo].alt)} preload sizes="(min-width: 1024px) 30rem, 100vw" className="absolute inset-0" />
          </div>
        </div>
      </section>

      {/* Who it is for and what we treat */}
      <div className="container-page grid gap-6 py-12 lg:grid-cols-2">
        <section aria-labelledby="who" className="card space-y-3 p-6 sm:p-8">
          <h2 id="who" className="text-2xl font-extrabold">
            {t("Who it is for")}
          </h2>
          <p className="text-lg text-fg">{copy.whoFor}</p>
          <p className="text-fg-muted">{t(s.description)}</p>
        </section>
        <section aria-labelledby="treat" className="card space-y-4 p-6 sm:p-8">
          <h2 id="treat" className="text-2xl font-extrabold">
            {t("What we treat")}
          </h2>
          <CheckList items={s.treats.map((x) => t(x))} className="grid gap-x-6 gap-y-2 space-y-0 sm:grid-cols-2" />
          {s.symptoms.length ? (
            <div className="space-y-3 border-t border-line pt-4">
              <h3 className="text-lg font-bold">{t("Common symptoms")}</h3>
              <ul className="flex flex-wrap gap-2">
                {s.symptoms.map((x) => (
                  <li key={x} className="rounded-full border border-line bg-surface-2 px-3 py-1 text-[0.9375rem]">
                    {t(x)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      {/* Doctors */}
      <section aria-labelledby="docs" className="bg-surface py-12">
        <div className="container-page space-y-6">
          <SectionHeading
            id="docs"
            title={t("Our doctors in {specialty}", { specialty: name })}
            description={t("Every doctor's registration is checked before they are listed, and again every 12 months.")}
            action={
              docs.length ? (
                <Link href={doctorsHref} className="tap inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                  {t("See all")} <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : null
            }
          />
          {docs.length ? (
            <div className="grid gap-4">
              {docs.map((d) => (
                <DoctorCard key={d.id} d={d} ctx={ctx} qualifications={quals.get(d.id) ?? ""} />
              ))}
            </div>
          ) : (
            <div className="card space-y-4 p-6">
              <p className="text-lg">{t("Our {specialty} doctors are joining soon. Meanwhile, ask us to call you back and we will help you.", { specialty: name })}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ContactButtons t={t} />
              </div>
            </div>
          )}
          {reviewer ? (
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-fg-muted">
              <BadgeCheck className="size-4 text-primary" aria-hidden />
              {t("Medically reviewed by")}{" "}
              <Link href={`/doctors/${reviewer.slug}`} className="underline underline-offset-2">
                {reviewer.fullName}
              </Link>
              {s.reviewedAt ? <span>· {fmt.date(s.reviewedAt)}</span> : null}
            </p>
          ) : null}
        </div>
      </section>

      {/* Treatment in India */}
      <section aria-labelledby="india" className="container-page py-12">
        <div className="card grid overflow-hidden md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 p-6 sm:p-8">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
              <Plane className="size-4" aria-hidden />
              {t("Treatment in India")}
            </p>
            <h2 id="india" className="text-2xl font-extrabold">
              {t("Planning treatment in India?")}
            </h2>
            <p className="text-fg-muted">
              {t("Send us your reports and a specialist reviews them. You get a written treatment plan and a cost estimate in your currency, and help with your visa, travel and stay.")}
            </p>
            <CheckList items={copy.inIndia} />
            <ButtonLink href="/treatment-in-india" variant="secondary" className="whitespace-normal">
              {t("Get a treatment plan")}
            </ButtonLink>
          </div>
          <div className="relative hidden md:block">
            <Photo photo="hospitalCorridor" alt="" sizes="(min-width: 768px) 24rem, 1px" className="absolute inset-0" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faqs.length ? (
        <section aria-labelledby="faq" className="container-page max-w-3xl space-y-6 pb-4">
          <SectionHeading id="faq" title={t("Questions people ask")} />
          <FaqList items={faqs} />
        </section>
      ) : null}

      {docs.length ? (
        <CtaBand id="cta" title={t("Talk to a doctor in {specialty}", { specialty: name })} text={t("Book a video consultation at a time that suits you. You see the full price before you pay.")}>
          <ButtonLink href={doctorsHref} size="lg" className="bg-on-primary text-primary shadow-sm hover:bg-on-primary/90">
            {t("Book a consultation")}
          </ButtonLink>
          <ButtonLink href="/help/callback" size="lg" variant="outline" className="border-on-primary/70 bg-transparent text-on-primary hover:bg-on-primary/10">
            {t("Request a call back")}
          </ButtonLink>
        </CtaBand>
      ) : (
        <CtaBand id="cta" title={t("Questions about {specialty}?", { specialty: name })} text={t("Ask us to call you back and we will help you.")}>
          <ButtonLink href="/help/callback" size="lg" className="bg-on-primary text-primary shadow-sm hover:bg-on-primary/90">
            {t("Request a call back")}
          </ButtonLink>
          <ButtonLink href="/contact" size="lg" variant="outline" className="border-on-primary/70 bg-transparent text-on-primary hover:bg-on-primary/10">
            {t("Contact us")}
          </ButtonLink>
        </CtaBand>
      )}
    </>
  );
}
