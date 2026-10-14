import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewContext } from "@/server/context";
import { LEGAL } from "@/content/legal";
import { Markdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";

export function generateStaticParams() {
  return Object.keys(LEGAL).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = LEGAL[(await params).slug];
  return d ? { title: d.title, description: d.summary } : {};
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = LEGAL[slug];
  if (!d) notFound();
  const { t, intl } = await getViewContext();
  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[14rem_1fr]">
      <nav aria-label={t("Legal")} className="lg:sticky lg:top-24 lg:self-start">
        <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {Object.entries(LEGAL).map(([k, v]) => (
            <li key={k}><Link href={`/legal/${k}`} aria-current={k === slug ? "page" : undefined} className="tap inline-flex items-center rounded-lg px-3 hover:bg-surface-2 aria-[current=page]:bg-primary-soft aria-[current=page]:font-semibold">{t(v.title)}</Link></li>
          ))}
        </ul>
      </nav>
      <article className="space-y-4">
        <h1 className="text-3xl font-extrabold">{t(d.title)}</h1>
        <p className="text-sm text-fg-muted">{t("Last updated {date}", { date: formatDate(d.updated, "Asia/Kolkata", intl) })}</p>
        <Markdown text={d.body} />
      </article>
    </div>
  );
}
