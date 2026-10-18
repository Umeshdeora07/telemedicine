import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getViewContext } from "@/server/context";
import { LEGAL } from "@/content/legal";
import { Markdown } from "@/lib/markdown";
import { formatDate } from "@/lib/format";

export function generateStaticParams() {
  return Object.keys(LEGAL).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = LEGAL[(await params).slug];
  if (!d) return {};
  const { t } = await getI18n();
  return { title: t(d.title), description: t(d.summary) };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = LEGAL[slug];
  if (!d) notFound();
  const { t, intl, locale } = await getViewContext();
  return (
    <div className="container-page grid gap-8 py-8 sm:py-10 lg:grid-cols-[15rem_1fr]">
      <nav aria-label={t("Legal")} className="lg:sticky lg:top-24 lg:self-start">
        <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {Object.entries(LEGAL).map(([k, v]) => (
            <li key={k}>
              <Link
                href={`/legal/${k}`}
                aria-current={k === slug ? "page" : undefined}
                className="tap inline-flex items-center rounded-lg px-3 hover:bg-surface-2 aria-[current=page]:bg-primary-soft aria-[current=page]:font-semibold aria-[current=page]:text-primary-soft-fg"
              >
                {t(v.title)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <article className="max-w-3xl space-y-4">
        <h1 className="text-3xl font-extrabold">{t(d.title)}</h1>
        <p className="text-lg text-fg-muted">{t(d.summary)}</p>
        <p className="text-sm text-fg-muted">{t("Last updated {date}", { date: formatDate(d.updated, "Asia/Kolkata", intl) })}</p>
        {locale !== "en" ? (
          <p className="rounded-xl bg-primary-soft p-4 text-primary-soft-fg">
            {t("This page is in English. If you need help understanding it, please contact us.")}{" "}
            <Link href="/contact" className="font-semibold underline">
              {t("Contact us")}
            </Link>
          </p>
        ) : null}
        <div lang="en">
          <Markdown text={d.body} />
        </div>
      </article>
    </div>
  );
}
