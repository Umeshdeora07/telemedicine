import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { complaintList } from "@/server/admin";
import { brand } from "@/config/brand";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ComplaintForm } from "@/components/admin/admin-forms";
import { humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Complaints" };

export default async function ComplaintsPage() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const rows = await complaintList();
  const now = new Date();
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title={t("Complaints and grievances")} description={t("Acknowledge within {ack} hours and resolve within {days} days. Grievance officer: {name}.", { ack: brand.grievanceSla.acknowledgeHours, days: brand.grievanceSla.resolveDays, name: brand.grievanceOfficer.name })} />
      <ul className="space-y-3">
        {rows.map((c) => {
          const open = !["resolved", "closed"].includes(c.status);
          const late = open && (c.resolveBy < now || (!c.acknowledgedAt && c.acknowledgeBy < now));
          return (
            <li key={c.id} className="card space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{c.subject}</strong>
                <span className="text-sm text-fg-muted">{c.ref} · {c.name} · {t(c.category)}</span>
                <span className="ms-auto flex gap-2">{late ? <Badge tone="danger">{t("Past deadline")}</Badge> : null}<Badge tone={open ? "warning" : "success"}>{t(humanize(c.status))}</Badge></span>
              </div>
              <p className="whitespace-pre-line">{c.description}</p>
              <p className="text-sm text-fg-muted">{t("Received {date} · acknowledge by {ack} · resolve by {res}", { date: fmt.dateTime(c.createdAt), ack: fmt.dateTime(c.acknowledgeBy), res: fmt.date(c.resolveBy) })}</p>
              {c.updates.length ? (
                <ol className="space-y-1 border-s-2 border-line ps-3 text-sm">
                  {c.updates.map((u, i) => <li key={i}><strong>{fmt.dateTime(u.at)}</strong> · {u.by}{u.status ? ` · ${t(humanize(u.status))}` : ""}: {u.note}{u.public ? "" : ` (${t("internal")})`}</li>)}
                </ol>
              ) : null}
              {open ? <ComplaintForm id={c.id} status={c.status} /> : c.resolution ? <p><strong>{t("Resolution:")}</strong> {c.resolution}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
