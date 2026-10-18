import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Stethoscope } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { getViewContext } from "@/server/context";
import { getSpecialties } from "@/server/queries/reference";
import { ButtonLink } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import { CheckList } from "@/components/marketing/blocks";
import { SPECIALTY_PHOTO, siteSpecialties, specialtyCopy, startingPrice } from "@/components/marketing/specialty-content";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t("Our specialties"),
    description: t("Orthopaedics, Dermatology, General Physician and Psychology. See what each specialty covers, the doctors and the fees, and book an online consultation."),
  };
}

export default async function SpecialtiesPage() {
  const ctx = await getViewContext();
  const { t } = ctx;
  const specs = siteSpecialties(await getSpecialties());
  const copy = specialtyCopy(t);

  return (
    <>
      <section aria-labelledby="title" className="bg-primary-soft">
        <div className="container-page space-y-3 py-10 sm:py-14">
          <nav aria-label={t("Breadcrumb")} className="text-sm text-fg-muted">
            <Link href="/" className="hover:underline">
              {t("Home")}
            </Link>{" "}
            › <span aria-current="page">{t("Specialties")}</span>
          </nav>
          <h1 id="title" className="text-[2rem] font-extrabold leading-tight sm:text-5xl">
            {t("Our specialties")}
          </h1>
          <p className="max-w-2xl text-lg text-fg">
            {t("We focus on four areas of care. Choose one to see what it covers, who it is for and the doctors you can book.")}
          </p>
        </div>
      </section>

      <section aria-label={t("Specialties")} className="container-page py-10">
        <ul className="grid gap-6 md:grid-cols-2">
          {specs.map((s) => {
            const price = startingPrice(ctx, s.startingFeeMinor);
            const name = t(s.name);
            return (
              <li key={s.id} className="card flex flex-col overflow-hidden">
                <Link href={`/specialties/${s.slug}`} className="group flex flex-1 flex-col">
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Photo
                      photo={SPECIALTY_PHOTO[s.slug]}
                      alt=""
                      sizes="(min-width: 768px) 34rem, 100vw"
                      className="absolute inset-0"
                      imgClassName="transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-2xl font-extrabold group-hover:underline">{name}</h2>
                      {price ? <span className="rounded-full bg-primary-soft px-3 py-0.5 text-sm font-semibold text-primary-soft-fg">{price}</span> : null}
                    </div>
                    <p className="text-lg text-fg">{t(s.shortDescription)}</p>
                    <p className="text-fg-muted">{copy[s.slug].whoFor}</p>
                  </div>
                </Link>
                <div className="flex flex-col gap-3 border-t border-line p-5 sm:flex-row sm:p-6">
                  <ButtonLink href={`/doctors?specialty=${s.slug}`} aria-label={t("See doctors in {specialty}", { specialty: name })}>
                    {t("See doctors")}
                  </ButtonLink>
                  <ButtonLink href={`/specialties/${s.slug}`} variant="outline" aria-label={t("Learn more about {specialty}", { specialty: name })}>
                    {t("Learn more")}
                    <ArrowRight className="size-4" aria-hidden />
                  </ButtonLink>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="unsure" className="container-page pb-6">
        <div className="card flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Stethoscope className="size-6" />
            </span>
            <div className="space-y-2">
              <h2 id="unsure" className="text-xl font-extrabold sm:text-2xl">
                {t("Not sure which doctor you need?")}
              </h2>
              <CheckList
                className="text-fg-muted"
                items={[
                  t("Start with a General Physician. They treat most everyday problems and will tell you if you need a specialist."),
                  t("Or ask us to call you back, and we will help you choose."),
                ]}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <ButtonLink href="/doctors?specialty=general-physician">{t("See General Physicians")}</ButtonLink>
            <ButtonLink href="/help/callback" variant="outline">
              {t("Request a call back")}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
