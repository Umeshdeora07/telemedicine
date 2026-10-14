import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { doctorForUser } from "@/server/consult";
import { doctorEarnings } from "@/server/doctor-portal";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Earnings" };

const PAYOUT_TONE = { released: "success", paid_out: "success", held: "warning", refunded: "danger" } as const;

export default async function DoctorEarnings() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const d = (await doctorForUser(ctx.user!))!;
  const e = await doctorEarnings(d);
  const inr = (n: number) => fmt.money(n, "INR");

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("Earnings and payouts")}
        description={t("Patients pay up front. We hold the fee until the consult is done, then release it to you. Payouts go to your bank every Monday.")}
      />

      <section aria-labelledby="month" className="space-y-3">
        <h2 id="month" className="text-lg font-bold">{t("This month")}</h2>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            [t("Consult fees released"), inr(e.released), t("{n} consults completed", { n: e.consults })],
            [t("Platform commission ({p}%)", { p: Math.round(e.commissionRate * 100) }), `− ${inr(e.commission)}`, t("Includes payment gateway costs")],
            [t("TDS deducted (10%)"), `− ${inr(e.tds)}`, t("Form 16A is issued every quarter")],
            [t("Net payable to you"), inr(e.net), t("Paid out on Monday")],
          ].map(([k, v, h]) => (
            <div key={k} className="card p-4">
              <dt className="text-sm text-fg-muted">{k}</dt>
              <dd className="text-2xl font-extrabold text-heading">{v}</dd>
              <dd className="text-sm text-fg-muted">{h}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-fg-muted">
          {t("Held for upcoming consults: {held}. Refunded to patients (doctor no-show or cancellation): {ref}.", { held: inr(e.held), ref: inr(e.refunded) })}
        </p>
      </section>

      <section aria-labelledby="payouts" className="space-y-3">
        <h2 id="payouts" className="text-lg font-bold">{t("Payouts")}</h2>
        {e.payouts.length ? (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-[0.9375rem]">
              <caption className="sr-only">{t("Payouts")}</caption>
              <thead className="border-b border-line text-sm text-fg-muted">
                <tr>
                  <th scope="col" className="p-3 font-semibold">{t("Period")}</th>
                  <th scope="col" className="p-3 font-semibold">{t("Consults")}</th>
                  <th scope="col" className="p-3 text-end font-semibold">{t("Gross")}</th>
                  <th scope="col" className="p-3 text-end font-semibold">{t("Net")}</th>
                  <th scope="col" className="p-3 font-semibold">{t("Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {e.payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3">{fmt.date(p.periodStart, undefined, { day: "numeric", month: "short" })} – {fmt.date(p.periodEnd)}</td>
                    <td className="p-3">{p.consults}</td>
                    <td className="p-3 text-end tabular-nums">{inr(p.grossMinor)}</td>
                    <td className="p-3 text-end font-semibold tabular-nums">{inr(p.netMinor)}</td>
                    <td className="p-3">
                      <Badge tone={p.status === "paid" ? "success" : "warning"}>{p.status === "paid" ? t("Paid") : t("Scheduled")}</Badge>
                      {p.reference ? <span className="ms-2 text-sm text-fg-muted">{p.reference}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={t("No payouts yet")}>{t("Your first payout appears here after your first completed consult.")}</EmptyState>
        )}
      </section>

      <section aria-labelledby="tx" className="space-y-3">
        <h2 id="tx" className="text-lg font-bold">{t("Recent consult payments")}</h2>
        {e.rows.length ? (
          <ul className="card divide-y divide-line">
            {e.rows.map(({ p, a }) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
                <span className="font-semibold">{a.ref}</span>
                <span className="text-fg-muted">{fmt.dateTime(a.startAt, d.timeZone)}</span>
                <span className="ms-auto tabular-nums">{fmt.money(p.feeMinor, p.currency)}</span>
                <Badge tone={PAYOUT_TONE[p.payoutState]}>
                  {{ released: t("Released"), paid_out: t("Paid out"), held: t("Held"), refunded: t("Refunded") }[p.payoutState]}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("No payments yet")} />
        )}
      </section>

      <p className="text-sm text-fg-muted">{t("Consult fees for medical consultation are exempt from GST. The platform fee and its GST are paid by the patient and are not part of your earnings.")}</p>
    </div>
  );
}
