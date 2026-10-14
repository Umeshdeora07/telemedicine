import type { Metadata } from "next";
import Link from "next/link";
import { getViewContext } from "@/server/context";
import { adminOverview } from "@/server/admin";
import { getCountries } from "@/server/queries/reference";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { HBars, StackedColumns } from "@/components/charts/charts";
import { addDays } from "@/lib/time";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams;
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const [o, countries] = await Promise.all([adminOverview(days), getCountries()]);
  // Fill every day in the range so gaps show as zero.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const series = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1)).map((d) => {
    const row = o.daily.find((r) => r.day === d);
    return { label: fmt.date(`${d}T12:00:00Z`, "UTC", { weekday: "short", day: "numeric", month: "short" }), short: fmt.date(`${d}T12:00:00Z`, "UTC", { day: "numeric", month: "short", year: undefined }), values: [row?.online ?? 0, row?.clinic ?? 0] };
  });
  const completed = o.statusCounts.find((s) => s.status === "completed")?.n ?? 0;
  const tiles: [string, string, string?][] = [
    [t("Consults completed"), fmt.number(completed)],
    [t("Payments (₹, all currencies)"), fmt.money(o.money.gmvInr, "INR"), t("{n} payments", { n: o.money.count })],
    [t("Refunded"), fmt.money(o.money.refundedInr, "INR")],
    [t("Average rating"), o.rating.n ? `${o.rating.avg.toFixed(2)} ★` : "—", t("{n} reviews", { n: o.rating.n })],
    [t("Doctor no-show rate"), `${(o.doctorNoShowRate * 100).toFixed(1)}%`, t("auto-refunded")],
  ];
  return (
    <div className="space-y-6">
      <PageHeader title={t("Overview")} description={t("Bookings, money and quality across the platform. Times in India time.")} />
      <LinkTabs label={t("Date range")} current={String(days)} tabs={[7, 30, 90].map((d) => ({ key: String(d), href: `/admin?days=${d}`, label: t("Last {n} days", { n: d }) }))} />
      {o.pendingDoctors || o.openComplaints ? (
        <p className="flex flex-wrap gap-4">
          {o.pendingDoctors ? <Link href="/admin/verification" className="font-semibold text-primary underline">{t("Doctors waiting for verification: {n}", { n: o.pendingDoctors })}</Link> : null}
          {o.openComplaints ? <Link href="/admin/complaints" className="font-semibold text-primary underline">{t("Open complaints: {n}", { n: o.openComplaints })}</Link> : null}
        </p>
      ) : null}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map(([k, v, h]) => (
          <div key={k} className="card p-4">
            <dt className="text-sm text-fg-muted">{k}</dt>
            <dd className="text-2xl font-bold text-heading">{v}</dd>
            {h ? <dd className="text-sm text-fg-muted">{h}</dd> : null}
          </div>
        ))}
      </dl>
      <section className="card p-5">
        <StackedColumns
          title={t("Consults per day")}
          tableCaption={t("Consults per day, online and in clinic")}
          series={[{ key: "online", name: t("Online"), color: "var(--series-1)" }, { key: "clinic", name: t("In clinic"), color: "var(--series-2)" }]}
          data={series}
        />
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <HBars title={t("Completed consults by specialty")} tableCaption={t("Completed consults by specialty")} valueHeader={t("Consults")} data={o.bySpecialty.slice(0, 8).map((r) => ({ label: t(r.name), value: r.n }))} />
        </section>
        <section className="card p-5">
          <HBars title={t("Consults by patient location")} tableCaption={t("Consults by patient location")} valueHeader={t("Consults")} data={o.byCountry.slice(0, 8).map((r) => ({ label: t(countries.find((c) => c.code === r.country)?.name ?? r.country), value: r.n }))} />
        </section>
      </div>
    </div>
  );
}
