import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { plans } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { activePlans, myPeople } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { PlanCards } from "@/components/plans/plan-cards";

export const metadata: Metadata = { title: "Care plans" };

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ subscribed?: string }> }) {
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const [mine, list, people] = await Promise.all([activePlans(user!.id), (await getDb()).select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.sortOrder)), myPeople(user!.id)]);
  const bookable = people.filter((p) => !p.link || (p.link.status === "active" && p.link.canBook)).map((p) => ({ id: p.patient.id, name: p.patient.fullName }));
  return (
    <div className="space-y-6">
      <PageHeader title={t("Care plans")} description={t("Monthly plans for families and for long-term conditions like diabetes and blood pressure.")} />
      {sp.subscribed ? <Alert tone="success" title={t("Your plan is active")}>{t("Consults covered by the plan show as ₹0 when you book.")}</Alert> : null}
      {mine.length ? (
        <section className="space-y-2" aria-labelledby="mine">
          <h2 id="mine" className="text-lg font-bold">{t("Your plans")}</h2>
          <ul className="space-y-2">
            {mine.map(({ s, plan }) => (
              <li key={s.id} className="card flex flex-wrap items-center gap-3 p-4">
                <strong>{t(plan.name)}</strong>
                <span className="text-fg-muted">{t("{used} of {total} consults used this month", { used: s.consultsUsed, total: plan.consultsPerMonth })} · {t("renews {date}", { date: fmt.date(s.periodEnd) })}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <PlanCards list={list} ctx={ctx} people={bookable} />
    </div>
  );
}
