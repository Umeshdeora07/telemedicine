import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { BadgeCheck } from "lucide-react";
import { getDb } from "@/db";
import { articles, doctors } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { Markdown } from "@/lib/markdown";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd } from "@/components/common/json-ld";

async function load(slug: string) {
  const [r] = await (await getDb()).select({ a: articles, reviewer: doctors.fullName, reviewerSlug: doctors.slug }).from(articles).leftJoin(doctors, eq(doctors.id, articles.reviewedByDoctorId)).where(and(eq(articles.slug, slug), eq(articles.published, true)));
  return r ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = await load((await params).slug);
  return r ? { title: r.a.title, description: r.a.summary } : {};
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const r = await load((await params).slug);
  if (!r) notFound();
  const { t, fmt } = await getViewContext();
  const { a } = r;
  return (
    <article className="container-page max-w-3xl space-y-6 py-8">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "MedicalWebPage", headline: a.title, description: a.summary, lastReviewed: a.reviewedAt?.toISOString(), reviewedBy: r.reviewer ? { "@type": "Physician", name: r.reviewer } : undefined }} />
      <nav aria-label={t("Breadcrumb")} className="text-sm text-fg-muted"><Link href="/health-library" className="hover:underline">{t("Health library")}</Link> › {t(a.category)}</nav>
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{a.title}</h1>
        <p className="text-lg text-fg-muted">{a.summary}</p>
        {r.reviewer ? <p className="flex items-center gap-2 text-sm"><BadgeCheck className="size-4 text-primary" aria-hidden />{t("Medically reviewed by")} <Link href={`/doctors/${r.reviewerSlug}`} className="underline">{r.reviewer}</Link>{a.reviewedAt ? ` · ${fmt.date(a.reviewedAt)}` : ""}</p> : null}
      </header>
      <Markdown text={a.body} />
      <div className="card flex flex-wrap items-center gap-3 p-5">
        <p className="flex-1 font-semibold">{t("Have a question about your own health?")}</p>
        <ButtonLink href="/consult-now">{t("Talk to a doctor")}</ButtonLink>
      </div>
      <p className="text-sm text-fg-muted">{t("This article is general information, not medical advice for you. In an emergency, call 112 (India) or your local emergency number.")}</p>
    </article>
  );
}
