import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { getViewContext } from "@/server/context";
import { myPayments } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments" };

const PURPOSE: Record<string, string> = { consult: "Online consultation", clinic_visit: "Clinic visit", plan: "Earlier care plan", second_opinion: "Earlier report review", case_deposit: "Treatment deposit", case_final: "Hospital bill" };

export default async function InvoicesPage() {
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const rows = await myPayments(user!.id);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t("Payments")} description={t("Every payment with its GST invoice. Useful for insurance claims and company reimbursements.")} />
      {rows.length ? (
        <ul className="card divide-y divide-line">
          {rows.map(({ p, apptRef, doctorName }) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4">
              <span className="min-w-0">
                <span className="block font-semibold">{t(PURPOSE[p.purpose] ?? humanize(p.purpose))}{doctorName ? ` · ${doctorName}` : ""}</span>
                <span className="block text-sm text-fg-muted">{fmt.date(p.createdAt)}{apptRef ? ` · ${apptRef}` : ""}{p.method ? ` · ${p.method.toUpperCase()}` : ""}</span>
              </span>
              <span className="ms-auto flex flex-wrap items-center gap-2">
                <span className="font-semibold tabular-nums">{fmt.money(p.amountMinor, p.currency)}</span>
                {p.refundedMinor ? <Badge tone="warning">{t("Refunded {amount}", { amount: fmt.money(p.refundedMinor, p.currency) })}</Badge> : null}
                {p.invoiceNumber ? <a href={`/api/invoices/${p.id}`} target="_blank" rel="noopener" className="tap inline-flex items-center gap-1 text-primary underline"><Receipt className="size-4" aria-hidden />{t("Invoice")}</a> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Receipt className="size-8" aria-hidden />} title={t("No payments yet")} />
      )}
    </div>
  );
}
