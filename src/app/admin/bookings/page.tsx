import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { searchBookings } from "@/server/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { statusBadge } from "@/components/patient/appointment-card";

export const metadata: Metadata = { title: "Bookings" };

const STATUSES = ["pending_payment", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "doctor_no_show", "patient_no_show", "expired"];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ q?: string; s?: string }> }) {
  const { q = "", s = "" } = await searchParams;
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const rows = await searchBookings(q, STATUSES.includes(s) ? s : undefined);
  return (
    <div className="space-y-6">
      <PageHeader title={t("Bookings")} description={t("Find any booking by reference, patient or doctor.")} />
      <form role="search" className="flex flex-wrap gap-2">
        <label htmlFor="bq" className="sr-only">{t("Search")}</label>
        <Input id="bq" name="q" defaultValue={q} placeholder={t("CM-… or a name")} className="max-w-xs" />
        <label htmlFor="bs" className="sr-only">{t("Status")}</label>
        <Select id="bs" name="s" defaultValue={s} className="w-auto"><option value="">{t("Any status")}</option>{STATUSES.map((x) => <option key={x} value={x}>{t(x.replace(/_/g, " "))}</option>)}</Select>
        <Button type="submit" variant="secondary">{t("Search")}</Button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-[0.9375rem]">
          <caption className="sr-only">{t("Bookings")}</caption>
          <thead className="border-b border-line text-sm text-fg-muted"><tr><th scope="col" className="p-3">{t("Ref")}</th><th scope="col" className="p-3">{t("When (IST)")}</th><th scope="col" className="p-3">{t("Patient")}</th><th scope="col" className="p-3">{t("Doctor")}</th><th scope="col" className="p-3">{t("Mode")}</th><th scope="col" className="p-3">{t("Location")}</th><th scope="col" className="p-3 text-end">{t("Total")}</th><th scope="col" className="p-3">{t("Status")}</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ a, patientName, doctorName }) => (
              <tr key={a.id}>
                <td className="p-3 font-mono text-sm">{a.ref}</td>
                <td className="p-3">{fmt.dateTime(a.startAt, "Asia/Kolkata")}</td>
                <td className="p-3">{patientName}{a.bookedByRole !== "patient" ? <span className="block text-xs text-fg-muted">{t("by {role}", { role: t(a.bookedByRole.replace("_", " ")) })}</span> : null}</td>
                <td className="p-3">{doctorName}</td>
                <td className="p-3">{t(a.mode)}</td>
                <td className="p-3">{[a.patientLocationRegion, a.patientLocationCountry].filter(Boolean).join(", ")}</td>
                <td className="p-3 text-end tabular-nums">{fmt.money(a.totalMinor, a.currency)}</td>
                <td className="p-3">{statusBadge(a.status, t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
