import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { AlertTriangle, BadgeCheck, Video } from "lucide-react";
import { getDb } from "@/db";
import { conditions, doctors, specialties } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { listDoctors } from "@/server/doctors";
import { resolveLocation, locationParam } from "@/server/location";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { SpecialtyIcon } from "@/components/ui/icon";
import { DoctorCard } from "@/components/doctor/doctor-card";
import { JsonLd } from "@/components/common/json-ld";

async function load(slug: string) {
  const db = await getDb();
  const [s] = await db.select().from(specialties).where(eq(specialties.slug, slug));
  return s ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await load((await params).slug);
  return s ? { title: `${s.name}: consult online`, description: s.shortDescription } : {};
}

export default async function SpecialtyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await load(slug);
  if (!s) notFound();
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const db = await getDb();
  const loc = resolveLocation(undefined, ctx.declared, ctx.user);
  const [conds, docs, [reviewer]] = await Promise.all([
    db.select().from(conditions).where(eq(conditions.specialtyId, s.id)),
    listDoctors(loc, { specialty: s.slug, sort: "soonest", limit: 6 }),
    s.reviewedByDoctorId ? db.select({ fullName: doctors.fullName, slug: doctors.slug }).from(doctors).where(eq(doctors.id, s.reviewedByDoctorId)) : Promise.resolve([]),
  ]);
  return (
    <div className="container-page space-y-10 py-8">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: s.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <nav aria-label={t("Breadcrumb")} className="text-sm text-fg-muted"><Link href="/specialties" className="hover:underline">{t("Specialties")}</Link> › {t(s.name)}</nav>
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <PageHeader eyebrow={<span className="inline-flex items-center gap-2"><SpecialtyIcon name={s.icon} className="size-5" />{t("Specialty")}</span>} title={t(s.name)} description={t(s.description)} />
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={`/doctors?specialty=${s.slug}&for=${locationParam(loc)}`} size="lg">{t("See {specialty} doctors", { specialty: t(s.name).toLowerCase() })}</ButtonLink>
            <ButtonLink href="/consult-now" size="lg" variant="outline"><Video className="size-5" aria-hidden />{t("Consult now")}</ButtonLink>
          </div>
          {s.symptoms.length ? (
            <section aria-labelledby="sym" className="space-y-2">
              <h2 id="sym" className="text-xl font-bold">{t("Common reasons people see this doctor")}</h2>
              <ul className="flex flex-wrap gap-2">{s.symptoms.map((x) => <li key={x}><Link href={`/doctors?q=${encodeURIComponent(x)}`} className="tap inline-flex items-center rounded-full border border-line bg-surface px-4 hover:border-primary">{t(x)}</Link></li>)}</ul>
            </section>
          ) : null}
          {conds.length ? (
            <section aria-labelledby="cond" className="space-y-2">
              <h2 id="cond" className="text-xl font-bold">{t("Conditions")}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">{conds.map((c) => <li key={c.id}><Link href={`/conditions/${c.slug}`} className="card block p-4 hover:border-primary"><span className="font-semibold">{t(c.name)}</span><span className="block text-sm text-fg-muted">{t(c.summary)}</span></Link></li>)}</ul>
            </section>
          ) : null}
        </div>
        <aside className="space-y-4">
          <div className="card space-y-2 p-5">
            <p className="flex items-center gap-2 font-semibold text-danger"><AlertTriangle className="size-5" aria-hidden />{t("Not for emergencies")}</p>
            <p className="text-sm">{t("Chest pain, trouble breathing, stroke signs, heavy bleeding or a severe allergic reaction need emergency care now.")}</p>
            <Link href="/emergency" className="font-semibold text-danger underline">{t("Emergency help")}</Link>
          </div>
          {reviewer ? <p className="flex items-center gap-2 text-sm text-fg-muted"><BadgeCheck className="size-4 text-primary" aria-hidden />{t("Medically reviewed by")} <Link href={`/doctors/${reviewer.slug}`} className="underline">{reviewer.fullName}</Link>{s.reviewedAt ? ` · ${fmt.date(s.reviewedAt)}` : ""}</p> : null}
        </aside>
      </div>
      {docs.length ? (
        <section aria-labelledby="docs" className="space-y-4">
          <h2 id="docs" className="text-2xl font-bold">{t("Doctors available")}</h2>
          <div className="grid gap-4 lg:grid-cols-2">{docs.map((d) => <DoctorCard key={d.id} d={d} ctx={ctx} forLocation={locationParam(loc)} />)}</div>
        </section>
      ) : null}
      <section aria-labelledby="faq" className="max-w-3xl space-y-3">
        <h2 id="faq" className="text-2xl font-bold">{t("Questions people ask")}</h2>
        {s.faqs.map((f) => (
          <details key={f.q} className="card p-4">
            <summary className="tap flex cursor-pointer list-none items-center font-semibold">{t(f.q)}</summary>
            <p className="mt-2 text-fg-muted">{t(f.a)}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
