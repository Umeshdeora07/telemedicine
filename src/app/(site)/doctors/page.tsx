import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, UserRoundCheck } from "lucide-react";
import { getViewContext } from "@/server/context";
import { listDoctors } from "@/server/doctors";
import { getSpecialties } from "@/server/queries/reference";
import { DoctorCard, loadQualificationLines } from "@/components/doctor/doctor-card";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const spec = (await getSpecialties()).find((s) => s.slug === sp.specialty);
  return spec
    ? {
        title: `${spec.name} doctors`,
        description: `Book a video consultation with a ${spec.name} doctor registered in India and checked by our team.`,
      }
    : {
        title: "Our doctors",
        description: "Book a video consultation with a doctor registered in India. Orthopaedics, Dermatology, General Physician and Psychology.",
      };
}

export default async function DoctorsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t, tp } = ctx;
  const specs = await getSpecialties();
  const requested = typeof sp.specialty === "string" ? sp.specialty : undefined;
  const spec = specs.find((s) => s.slug === requested);

  // Only doctors who consult online, soonest available time first.
  const results = await listDoctors(null, { specialty: spec?.slug, mode: "online", sort: "soonest" });
  const quals = await loadQualificationLines(results.map((d) => d.id));

  const tabs = [{ key: "", label: t("All"), href: "/doctors" }, ...specs.map((s) => ({ key: s.slug, label: t(s.name), href: `/doctors?specialty=${s.slug}` }))];
  const current = spec?.slug ?? "";

  return (
    <div className="container-page py-8 sm:py-10">
      <header className="space-y-2 pb-6">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{spec ? t("{specialty} doctors", { specialty: t(spec.name) }) : t("Our doctors")}</h1>
        <p className="flex max-w-2xl items-start gap-2 text-lg text-fg-muted">
          <ShieldCheck className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
          <span>{t("Every doctor here is registered in India and checked by our team, so you can book a video consultation with confidence.")}</span>
        </p>
      </header>

      <nav aria-label={t("Specialties")} className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-2">
          {tabs.map((tab) => {
            const active = tab.key === current;
            return (
              <li key={tab.key || "all"}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "tap inline-flex items-center rounded-full border px-4 font-semibold transition-colors",
                    active ? "border-primary bg-primary text-on-primary" : "border-line bg-surface text-fg hover:border-primary hover:text-primary",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {results.length ? (
        <section aria-labelledby="results-heading" className="mt-6 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="results-heading" className="text-lg font-bold">
              {tp("{count} doctor", "{count} doctors", results.length)}
            </h2>
            {results.length > 1 ? <p className="text-sm text-fg-muted">{t("Doctors with the soonest available time are shown first.")}</p> : null}
          </div>
          <div className="grid gap-4">
            {results.map((d) => (
              <DoctorCard key={d.id} d={d} ctx={ctx} qualifications={quals.get(d.id) ?? ""} />
            ))}
          </div>
        </section>
      ) : (
        <section aria-labelledby="results-heading" className="card mt-6 flex flex-col items-center gap-4 px-6 py-12 text-center">
          <span aria-hidden className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
            <UserRoundCheck className="size-7" />
          </span>
          <h2 id="results-heading" className="text-2xl font-extrabold">
            {t("Our doctors are joining soon")}
          </h2>
          <p className="max-w-lg text-lg text-fg-muted">
            {t("Every doctor is checked by our team before they appear here. Meanwhile, you can ask us about treatment in India.")}
          </p>
          <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href="/treatment-in-india" size="lg">
              {t("Treatment in India")}
            </ButtonLink>
            <ButtonLink href="/contact" size="lg" variant="outline">
              {t("Contact us")}
            </ButtonLink>
          </div>
        </section>
      )}
    </div>
  );
}
