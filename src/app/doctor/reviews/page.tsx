import type { Metadata } from "next";
import { Star } from "lucide-react";
import { getViewContext } from "@/server/context";
import { doctorForUser } from "@/server/consult";
import { doctorReviews } from "@/server/doctor-portal";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ReviewReply } from "@/components/doctor/review-reply";

export const metadata: Metadata = { title: "Reviews" };

export default async function DoctorReviewsPage() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const d = (await doctorForUser(ctx.user!))!;
  const list = await doctorReviews(d);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: list.filter((r) => r.rating === n).length }));
  const max = Math.max(1, ...dist.map((x) => x.c));
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t("Reviews")} description={t("Only patients who completed a consult with you can leave a review. Reviews can't be edited or removed by doctors.")} />
      <section className="card grid gap-4 p-5 sm:grid-cols-[auto_1fr] sm:items-center" aria-label={t("Rating summary")}>
        <div className="text-center">
          <p className="text-5xl font-extrabold text-heading">{Number(d.ratingAvg).toFixed(1)}</p>
          <p className="text-fg-muted">{t("{n} reviews", { n: d.ratingCount })}</p>
        </div>
        <ul className="space-y-1">
          {dist.map(({ n, c }) => (
            <li key={n} className="flex items-center gap-2 text-sm">
              <span className="w-6 tabular-nums">{n}★</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <span className="block h-full rounded-full bg-accent" style={{ width: `${(c / max) * 100}%` }} />
              </span>
              <span className="w-8 text-end tabular-nums text-fg-muted">{c}</span>
            </li>
          ))}
        </ul>
      </section>
      {list.length ? (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="card space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex" aria-label={t("{n} out of 5 stars", { n: r.rating })}>
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} className={i < r.rating ? "size-4 fill-accent text-accent" : "size-4 text-line"} aria-hidden />)}
                </span>
                <span className="font-semibold">{r.authorDisplayName}</span>
                <span className="text-sm text-fg-muted">{fmt.date(r.createdAt)}</span>
                {r.status !== "published" ? <Badge tone="warning">{t(r.status)}</Badge> : null}
              </div>
              {r.text ? <p>{r.text}</p> : null}
              {r.tags.length ? <p className="flex flex-wrap gap-1">{r.tags.map((x) => <Badge key={x}>{t(x)}</Badge>)}</p> : null}
              <ReviewReply id={r.id} initial={r.doctorReply} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Star className="size-8" aria-hidden />} title={t("No reviews yet")}>{t("Reviews appear after patients complete a consult with you.")}</EmptyState>
      )}
    </div>
  );
}
