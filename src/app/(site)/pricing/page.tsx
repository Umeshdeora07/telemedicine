import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { plans } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { getPolicy } from "@/server/booking";
import { SECOND_OPINION_FEE_INR } from "@/server/second-opinion";
import { env } from "@/config/env";
import { convertFromInr } from "@/lib/pricing";
import type { Currency } from "@/config/currencies";
import { PageHeader } from "@/components/ui/page-header";
import { PlanCards } from "@/components/plans/plan-cards";

export const metadata: Metadata = { title: "Pricing", description: "Doctor fees, platform fee, refunds and care plans — no hidden charges." };

export default async function PricingPage() {
  const ctx = await getViewContext();
  const { t, fmt, currency, rate } = ctx;
  const [list, policy] = await Promise.all([(await getDb()).select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.sortOrder)), getPolicy()]);
  const show = (inr: number) => fmt.money(convertFromInr(inr, currency as Currency, rate), currency);
  const gstNote = currency === "INR" ? t("plus 18% GST on the platform fee only") : t("no GST for payments from outside India");
  return (
    <div className="container-page space-y-12 py-8">
      <PageHeader title={t("Clear prices, no surprises")} description={t("You always see the full amount before you pay.")} />
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card space-y-2 p-5"><h2 className="text-lg font-bold">{t("Doctor's fee")}</h2><p className="text-fg-muted">{t("Set by each doctor and shown on their profile. Online consults usually start from {fee}.", { fee: show(19900) })}</p></div>
        <div className="card space-y-2 p-5"><h2 className="text-lg font-bold">{t("Platform fee")}</h2><p className="text-fg-muted">{t("{fee} per booking ({gst}). It pays for secure video, records and support.", { fee: show(env.platformFeeInrMinor), gst: gstNote })}</p></div>
        <div className="card space-y-2 p-5"><h2 className="text-lg font-bold">{t("Second opinion")}</h2><p className="text-fg-muted">{t("{fee} for a written opinion from a senior specialist within 48 hours.", { fee: show(SECOND_OPINION_FEE_INR) })}</p></div>
      </section>
      <section className="card space-y-2 p-5">
        <h2 className="text-lg font-bold">{t("Refunds")}</h2>
        <ul className="list-disc space-y-1 ps-5">
          <li>{t("Doctor doesn't join within {n} minutes: full refund, automatically.", { n: policy.doctorNoShowMinutes })}</li>
          <li>{t("You cancel {h}+ hours before: full refund.", { h: policy.patientCancelFullRefundHours })}</li>
          <li>{t("You cancel later: {p}% refund.", { p: policy.patientCancelPartialRefundPercent })}</li>
          <li>{t("Reschedule free up to {h} hours before.", { h: policy.rescheduleFreeHours })}</li>
        </ul>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">{t("Care plans")}</h2>
        <p className="text-fg-muted">{t("Prices in Indian rupees.")}</p>
        <PlanCards list={list} ctx={ctx} people={null} />
      </section>
    </div>
  );
}
