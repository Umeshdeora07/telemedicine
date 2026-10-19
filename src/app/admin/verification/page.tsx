import type { Metadata } from "next";
import Link from "next/link";
import { getViewContext } from "@/server/context";
import { clinicQueue, verificationQueue } from "@/server/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ClinicDecision, DoctorJoinLink } from "@/components/admin/admin-forms";
import { getSpecialties } from "@/server/queries/reference";
import { env } from "@/config/env";
import { humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Verification" };

const TONE = { draft: "neutral", submitted: "accent", approved: "success", rejected: "danger", suspended: "danger" } as const;

export default async function VerificationQueue() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const [docs, clinics, specs] = await Promise.all([verificationQueue(), clinicQueue(), getSpecialties()]);
  const overdue = docs.filter((d) => d.d.verificationStatus === "approved" && d.d.reverifyDueAt && d.d.reverifyDueAt < new Date(Date.now() + 30 * 86400_000));
  return (
    <div className="space-y-8">
      <PageHeader title={t("Doctor and clinic verification")} description={t("Check every registration against the official register (National Medical Commission, State Medical Council, or Rehabilitation Council of India for psychologists) before a doctor goes live. Record what you checked. It is kept in the audit log.")} />
      <section className="card space-y-4 p-5" aria-labelledby="add-doctor">
        <div className="space-y-1">
          <h2 id="add-doctor" className="text-lg font-bold">{t("Add a new doctor")}</h2>
          <p className="text-fg-muted">
            {t("Send the doctor this link, for example by WhatsApp or email. They create their account and add their registration, degree, ID, photo, fees, times and payment details. Then they appear in the list below, and you verify them before patients can see them.")}
          </p>
        </div>
        <DoctorJoinLink baseUrl={env.appUrl} specialties={specs.map((s) => ({ slug: s.slug, name: s.name }))} />
      </section>
      {overdue.length ? <p className="font-semibold text-warning">{t("Yearly registration check due within 30 days: {names}", { names: overdue.map((d) => d.d.fullName).join(", ") })}</p> : null}
      <section className="space-y-3" aria-labelledby="docs">
        <h2 id="docs" className="text-lg font-bold">{t("Doctors")}</h2>
        {docs.length === 0 ? <p className="card p-4 text-fg-muted">{t("No doctors have joined yet. Send a doctor the link above.")}</p> : null}
        <ul className={docs.length ? "card divide-y divide-line" : "hidden"}>
          {docs.map(({ d, specialty, email }) => (
            <li key={d.id}>
              <Link href={`/admin/verification/${d.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 hover:bg-surface-2">
                <strong>{d.fullName}</strong>
                <span className="text-sm text-fg-muted">{t(specialty)}{email ? ` · ${email}` : ""}</span>
                <span className="ms-auto flex items-center gap-2">
                  {d.submittedAt && d.verificationStatus === "submitted" ? <span className="text-sm text-fg-muted">{t("submitted {date}", { date: fmt.date(d.submittedAt) })}</span> : null}
                  <Badge tone={TONE[d.verificationStatus]}>{t(humanize(d.verificationStatus))}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {clinics.length ? (
        <section className="space-y-3" aria-labelledby="clinics">
          <h2 id="clinics" className="text-lg font-bold">{t("Clinics and hospitals")}</h2>
          <ul className="card divide-y divide-line">
            {clinics.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 p-3">
                <strong>{c.name}</strong>
                <span className="text-sm text-fg-muted">{c.city}, {c.state} · {c.gstin ? `GSTIN ${c.gstin}` : t("No GSTIN")} · {c.accreditations.join(", ") || t("no accreditation listed")}</span>
                <span className="ms-auto flex items-center gap-2"><Badge tone={TONE[c.verificationStatus]}>{t(humanize(c.verificationStatus))}</Badge><ClinicDecision id={c.id} status={c.verificationStatus} /></span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
