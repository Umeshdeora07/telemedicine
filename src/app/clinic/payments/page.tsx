import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { getViewContext } from "@/server/context";
import { clinicPayments, currentClinic } from "@/server/clinic-portal";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Payments" };

export default async function ClinicPaymentsPage() {
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const clinic = (await currentClinic(user!))!;
  const rows = await clinicPayments(clinic);
  const desk = rows.filter((r) => r.p.gateway === "clinic_desk");
  return (
    <div className="space-y-6">
      <PageHeader title={t("Payments and invoices")} description={t("Clinic visit payments, online and at the desk. Open an invoice to reprint it for the patient.")} />
      <p className="text-fg-muted">{t("{n} payments taken at the desk", { n: desk.length })}</p>
      {rows.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-[0.9375rem]">
            <caption className="sr-only">{t("Payments")}</caption>
            <thead className="border-b border-line text-sm text-fg-muted">
              <tr>
                <th scope="col" className="p-3 font-semibold">{t("Date")}</th>
                <th scope="col" className="p-3 font-semibold">{t("Patient")}</th>
                <th scope="col" className="p-3 font-semibold">{t("Doctor")}</th>
                <th scope="col" className="p-3 text-end font-semibold">{t("Amount")}</th>
                <th scope="col" className="p-3 font-semibold">{t("Paid")}</th>
                <th scope="col" className="p-3 font-semibold">{t("Invoice")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.p.id}>
                  <td className="p-3">{fmt.date(r.p.createdAt, clinic.timeZone)}</td>
                  <td className="p-3">{r.patientName}</td>
                  <td className="p-3">{r.doctorName}</td>
                  <td className="p-3 text-end tabular-nums">{fmt.money(r.p.amountMinor, r.p.currency)}</td>
                  <td className="p-3"><Badge tone={r.p.status === "captured" ? "success" : "warning"}>{r.p.gateway === "clinic_desk" ? t("Desk ({m})", { m: r.p.method ?? "" }) : t("Online")}</Badge></td>
                  <td className="p-3">{r.p.invoiceNumber ? <a href={`/api/invoices/${r.p.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary underline"><Receipt className="size-4" aria-hidden />{r.p.invoiceNumber}</a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title={t("No payments yet")} />}
    </div>
  );
}
