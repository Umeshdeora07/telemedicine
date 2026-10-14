import type { Metadata } from "next";
import Link from "next/link";
import { getViewContext } from "@/server/context";
import { clinicQueue, verificationQueue } from "@/server/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ClinicDecision } from "@/components/admin/admin-forms";
import { humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Verification" };

const TONE = { draft: "neutral", submitted: "accent", approved: "success", rejected: "danger", suspended: "danger" } as const;

export default async function VerificationQueue() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const [docs, clinics] = await Promise.all([verificationQueue(), clinicQueue()]);
  const overdue = docs.filter((d) => d.d.verificationStatus === "approved" && d.d.reverifyDueAt && d.d.reverifyDueAt < new Date(Date.now() + 30 * 86400_000));
  return (
    <div className="space-y-8">
      <PageHeader title={t("Doctor and clinic verification")} description={t("Check every licence against the official register (NMC / state council, or the foreign board) before a doctor goes live. Record what you checked — it's kept in the audit log.")} />
      {overdue.length ? <p className="font-semibold text-warning">{t("Re-verification due within 30 days: {names}", { names: overdue.map((d) => d.d.fullName).join(", ") })}</p> : null}
      <section className="space-y-3" aria-labelledby="docs">
        <h2 id="docs" className="text-lg font-bold">{t("Doctors")}</h2>
        <ul className="card divide-y divide-line">
          {docs.map(({ d, specialty, email }) => (
            <li key={d.id}>
              <Link href={`/admin/verification/${d.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 hover:bg-surface-2">
                <strong>{d.fullName}</strong>
                <span className="text-sm text-fg-muted">{t(specialty)} · {email ?? "—"}</span>
                <span className="ms-auto flex items-center gap-2">
                  {d.submittedAt && d.verificationStatus === "submitted" ? <span className="text-sm text-fg-muted">{t("submitted {date}", { date: fmt.date(d.submittedAt) })}</span> : null}
                  <Badge tone={TONE[d.verificationStatus]}>{t(humanize(d.verificationStatus))}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3" aria-labelledby="clinics">
        <h2 id="clinics" className="text-lg font-bold">{t("Clinics and hospitals")}</h2>
        <ul className="card divide-y divide-line">
          {clinics.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 p-3">
              <strong>{c.name}</strong>
              <span className="text-sm text-fg-muted">{c.city}, {c.state} · GSTIN {c.gstin ?? "—"} · {c.accreditations.join(", ") || t("no accreditation listed")}</span>
              <span className="ms-auto flex items-center gap-2"><Badge tone={TONE[c.verificationStatus]}>{t(humanize(c.verificationStatus))}</Badge><ClinicDecision id={c.id} status={c.verificationStatus} /></span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
