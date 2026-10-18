import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { doctors } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { articleList } from "@/server/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ArticleForm, PublishToggle } from "@/components/admin/admin-forms";

export const metadata: Metadata = { title: "Health library" };

export default async function ContentPage() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const [rows, docs] = await Promise.all([articleList(), (await getDb()).select({ id: doctors.id, name: doctors.fullName }).from(doctors).where(eq(doctors.verificationStatus, "approved")).orderBy(asc(doctors.fullName))]);
  const categories = [...new Set(["Everyday health", "Diabetes", "Mental health", "Skin", "Bones and joints", "Travel for treatment", ...rows.map((r) => r.a.category)])];
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title={t("Health library")} description={t("Every article is reviewed by a verified doctor before it's published, and shows the reviewer and date.")} />
      <ul className="card divide-y divide-line">
        {rows.map(({ a, reviewer }) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2 p-3">
            <span className="font-semibold">{a.title}</span>
            <span className="text-sm text-fg-muted">{a.category} · {a.language} · {reviewer ? t("reviewed by {name}", { name: reviewer }) : t("not reviewed")} · {t("updated {date}", { date: fmt.date(a.updatedAt) })}</span>
            <span className="ms-auto flex items-center gap-2"><Badge tone={a.published ? "success" : "neutral"}>{a.published ? t("Published") : t("Draft")}</Badge><PublishToggle id={a.id} published={a.published} /></span>
          </li>
        ))}
      </ul>
      <section className="card space-y-3 p-5" aria-labelledby="new">
        <h2 id="new" className="text-lg font-bold">{t("New article")}</h2>
        <ArticleForm doctors={docs} categories={categories} />
      </section>
    </div>
  );
}
