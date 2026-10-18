import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { complianceBundle } from "@/server/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataRequestControls, IncidentForm, IncidentStep } from "@/components/admin/admin-forms";
import { humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Privacy and security" };

export default async function CompliancePage() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const { reqs, incidents } = await complianceBundle();
  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader title={t("Privacy and security")} description={t("Data requests under the DPDP Act (and GDPR for EU users), and the security incident log.")} />
      <section className="space-y-3" aria-labelledby="dr">
        <h2 id="dr" className="text-lg font-bold">{t("Data requests")}</h2>
        {reqs.length ? (
          <ul className="space-y-2">
            {reqs.map(({ r, name, email }) => (
              <li key={r.id} className="card space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{name ?? r.userId}</strong>
                  <span className="text-sm text-fg-muted">{email}</span>
                  <Badge tone="primary">{t(humanize(r.kind))}</Badge>
                  <Badge tone={r.status === "open" ? (r.dueAt < new Date() ? "danger" : "warning") : "success"} className="ms-auto">{r.status === "open" ? t("Due {date}", { date: fmt.date(r.dueAt) }) : t(humanize(r.status))}</Badge>
                </div>
                {r.note ? <p className="text-sm">{r.note}</p> : null}
                {r.status === "open" ? <DataRequestControls id={r.id} /> : null}
              </li>
            ))}
          </ul>
        ) : <EmptyState title={t("No data requests")} />}
        <p className="text-sm text-fg-muted">{t("People download their data themselves in Settings. Deletion requests keep records the law requires (prescriptions, invoices, consult notes) for the retention period and erase the rest.")}</p>
      </section>
      <section className="space-y-3" aria-labelledby="inc">
        <h2 id="inc" className="text-lg font-bold">{t("Security incidents")}</h2>
        {incidents.map((i) => (
          <div key={i.id} className="card space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <strong>{i.title}</strong>
              <Badge tone={i.severity === "critical" || i.severity === "high" ? "danger" : "warning"}>{t(humanize(i.severity))}</Badge>
              <Badge tone={i.status === "closed" ? "success" : "accent"} className="ms-auto">{t(humanize(i.status))}</Badge>
            </div>
            <p>{i.description}</p>
            <p className="text-sm text-fg-muted">{t("Detected {d} · contained {c} · reported {r} · users told {u} · affected {n}", { d: fmt.dateTime(i.detectedAt), c: i.containedAt ? fmt.dateTime(i.containedAt) : t("not yet"), r: i.reportedToBoardAt ? fmt.dateTime(i.reportedToBoardAt) : t("not yet"), u: i.usersNotifiedAt ? fmt.dateTime(i.usersNotifiedAt) : t("not yet"), n: i.affectedUsers })}</p>
            {i.status !== "closed" ? (
              <div className="flex flex-wrap gap-2">
                {!i.containedAt ? <IncidentStep id={i.id} field="containedAt" label={t("Mark contained")} /> : null}
                {!i.reportedToBoardAt ? <IncidentStep id={i.id} field="reportedToBoardAt" label={t("Reported to authorities")} /> : null}
                {!i.usersNotifiedAt ? <IncidentStep id={i.id} field="usersNotifiedAt" label={t("Affected users told")} /> : null}
                <IncidentStep id={i.id} field="closed" label={t("Close")} />
              </div>
            ) : null}
          </div>
        ))}
        <div className="card space-y-3 p-5">
          <h3 className="font-bold">{t("Log a new incident")}</h3>
          <IncidentForm />
        </div>
      </section>
    </div>
  );
}
