import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { BadgeCheck, Stethoscope } from "lucide-react";
import { getDb } from "@/db";
import { conditions, doctors, specialties } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Markdown } from "@/lib/markdown";
import { JsonLd } from "@/components/common/json-ld";

async function load(slug: string) {
  const db = await getDb();
  const [row] = await db.select({ c: conditions, s: specialties }).from(conditions).innerJoin(specialties, eq(specialties.id, conditions.specialtyId)).where(eq(conditions.slug, slug));
  return row ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = await load((await params).slug);
  return r ? { title: r.c.name, description: r.c.summary } : {};
}

export default async function ConditionPage({ params }: { params: Promise<{ slug: string }> }) {
  const r = await load((await params).slug);
  if (!r) notFound();
  const { c, s } = r;
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const [reviewer] = c.reviewedByDoctorId ? await (await getDb()).select({ fullName: doctors.fullName, slug: doctors.slug }).from(doctors).where(eq(doctors.id, c.reviewedByDoctorId)) : [];
  return (
    <article className="container-page max-w-3xl space-y-6 py-8">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "MedicalCondition", name: c.name, description: c.summary, signOrSymptom: c.symptoms.map((x) => ({ "@type": "MedicalSignOrSymptom", name: x })) }} />
      <nav aria-label={t("Breadcrumb")} className="text-sm text-fg-muted"><Link href={`/specialties/${s.slug}`} className="hover:underline">{t(s.name)}</Link> › {t(c.name)}</nav>
      <PageHeader title={t(c.name)} description={t(c.summary)} />
      {reviewer ? <p className="flex items-center gap-2 text-sm text-fg-muted"><BadgeCheck className="size-4 text-primary" aria-hidden />{t("Medically reviewed by")} <Link href={`/doctors/${reviewer.slug}`} className="underline">{reviewer.fullName}</Link>{c.reviewedAt ? ` · ${fmt.date(c.reviewedAt)}` : ""}</p> : null}
      {c.symptoms.length ? (
        <section className="card space-y-2 p-5"><h2 className="text-lg font-bold">{t("Common symptoms")}</h2><ul className="list-disc space-y-1 ps-5">{c.symptoms.map((x) => <li key={x}>{t(x)}</li>)}</ul></section>
      ) : null}
      <Alert tone="warning" title={t("See a doctor if")}>{t(c.whenToSeeDoctor)}</Alert>
      <Markdown text={c.body} />
      <div className="card flex flex-wrap items-center gap-3 p-5">
        <Stethoscope className="size-6 text-primary" aria-hidden />
        <p className="flex-1 font-semibold">{t("Talk to a {specialty} doctor", { specialty: t(s.name).toLowerCase() })}</p>
        <ButtonLink href={`/doctors?specialty=${s.slug}`}>{t("Find a doctor")}</ButtonLink>
      </div>
      {c.faqs.length ? (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">{t("Questions people ask")}</h2>
          {c.faqs.map((f) => <details key={f.q} className="card p-4"><summary className="tap flex cursor-pointer list-none items-center font-semibold">{t(f.q)}</summary><p className="mt-2 text-fg-muted">{t(f.a)}</p></details>)}
        </section>
      ) : null}
      <p className="text-sm text-fg-muted">{t("This page is general information, not a diagnosis. Everyone is different — talk to a doctor about your situation.")}</p>
    </article>
  );
}
