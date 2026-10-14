import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { BookOpen } from "lucide-react";
import { getDb } from "@/db";
import { articles, doctors } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Health library", description: "Plain-language health articles, reviewed by doctors." };

export default async function HealthLibrary({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t, fmt, locale } = ctx;
  const all = await (await getDb()).select({ a: articles, reviewer: doctors.fullName }).from(articles).leftJoin(doctors, eq(doctors.id, articles.reviewedByDoctorId)).where(and(eq(articles.published, true))).orderBy(desc(articles.publishedAt));
  // Show the reader's language first, then English.
  const list = all.filter((x) => x.a.language === locale || x.a.language === "en");
  const cats = [...new Set(list.map((x) => x.a.category))];
  const shown = sp.c ? list.filter((x) => x.a.category === sp.c) : list;
  return (
    <div className="container-page space-y-6 py-8">
      <PageHeader title={t("Health library")} description={t("Short, clear articles written for patients and reviewed by our doctors.")} />
      <LinkTabs label={t("Topics")} current={sp.c ?? "all"} tabs={[{ key: "all", href: "/health-library", label: t("All") }, ...cats.map((c) => ({ key: c, href: `/health-library?c=${encodeURIComponent(c)}`, label: t(c) }))]} />
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shown.map(({ a, reviewer }) => (
          <li key={a.id}>
            <Link href={`/health-library/${a.slug}`} className="card flex h-full flex-col gap-2 p-5 hover:border-primary">
              <span className="text-sm font-semibold text-primary">{t(a.category)}</span>
              <span className="text-lg font-bold text-heading">{a.title}</span>
              <span className="flex-1 text-fg-muted">{a.summary}</span>
              <span className="flex items-center gap-1.5 text-sm text-fg-muted"><BookOpen className="size-4" aria-hidden />{t("{n} min read", { n: a.readMinutes })}{reviewer ? ` · ${t("Reviewed by {name}", { name: reviewer })}` : ""}{a.publishedAt ? ` · ${fmt.date(a.publishedAt)}` : ""}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
