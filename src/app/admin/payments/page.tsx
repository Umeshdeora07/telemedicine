import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { getViewContext } from "@/server/context";
import { paymentsWithRefunds } from "@/server/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { RefundForm } from "@/components/admin/admin-forms";
import { humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments and refunds" };

export default async function PaymentsPage() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const rows = await paymentsWithRefunds();
  return (
    <div className="space-y-6">
      <PageHeader title={t("Payments and refunds")} description={t("Doctor no-shows are refunded automatically. Use manual refunds for disputes and goodwill; every refund is logged.")} />
      <ul className="space-y-3">
        {rows.map(({ p, name, refunds }) => {
          const left = p.amountMinor - p.refundedMinor;
          return (
            <li key={p.id} className="card space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{name}</strong>
                <span className="text-sm text-fg-muted">{t(p.purpose.replace("_", " "))} · {p.gateway}{p.method ? ` / ${p.method}` : ""} · {fmt.dateTime(p.createdAt)}</span>
                <span className="ms-auto font-semibold tabular-nums">{fmt.money(p.amountMinor, p.currency)}</span>
                <Badge tone={p.status === "captured" ? "success" : "warning"}>{t(humanize(p.status))}</Badge>
              </div>
              {p.invoiceNumber ? <a href={`/api/invoices/${p.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-primary underline"><Receipt className="size-4" aria-hidden />{p.invoiceNumber}</a> : null}
              {refunds.map((r) => <p key={r.id} className="text-sm">{t("Refunded {amount} on {date} ({by}): {reason}", { amount: fmt.money(r.amountMinor, r.currency), date: fmt.date(r.createdAt), by: r.initiatedBy, reason: r.reason })}</p>)}
              {left > 0 ? <RefundForm paymentId={p.id} left={fmt.money(left, p.currency)} currency={p.currency} /> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
