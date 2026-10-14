import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText, ShieldCheck } from "lucide-react";
import { openShareLink } from "@/server/patient-app";
import { getI18n } from "@/i18n/server";
import { formatDate } from "@/lib/format";
import { Logo } from "@/components/brand/logo";
import { ageFrom } from "@/lib/utils";

export const metadata: Metadata = { title: "Shared health records", robots: { index: false, follow: false } };

/** Public, time-limited view of documents a patient chose to share. */
export default async function SharedRecords({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t, intl } = await getI18n();
  const s = await openShareLink(token, { count: true });
  if (!s) notFound();
  const age = ageFrom(s.patient.dob);
  return (
    <main id="main" className="container-page max-w-2xl space-y-6 py-8">
      <Logo />
      <div className="card space-y-2 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary"><ShieldCheck className="size-4" aria-hidden />{t("Shared securely by the patient")}</p>
        <h1 className="text-2xl font-extrabold">{s.patient.fullName}</h1>
        <p className="text-fg-muted">{[age !== null ? t("{n} years", { n: age }) : null, s.patient.sex ? t(s.patient.sex === "female" ? "Female" : s.patient.sex === "male" ? "Male" : "Other") : null, s.patient.bloodGroup].filter(Boolean).join(" · ")}</p>
        {s.patient.allergies.length ? <p><strong className="text-danger">{t("Allergies:")}</strong> {s.patient.allergies.join(", ")}</p> : null}
        {s.patient.conditions.length ? <p><strong>{t("Conditions:")}</strong> {s.patient.conditions.join(", ")}</p> : null}
        <p className="text-sm text-fg-muted">{t("This link stops working on {date}. Every view is recorded and visible to the patient.", { date: formatDate(s.link.expiresAt, "Asia/Kolkata", intl) })}</p>
      </div>
      <ul className="card divide-y divide-line">
        {s.docs.map((d) => (
          <li key={d.id}>
            <a href={`/share/${token}/doc/${d.id}`} target="_blank" rel="noopener" className="flex items-center gap-2 p-4 hover:bg-surface-2">
              <FileText className="size-5 text-primary" aria-hidden />
              <span className="flex-1 font-medium">{d.title}</span>
              <span className="text-sm text-fg-muted">{formatDate(d.reportDate ?? d.createdAt, "Asia/Kolkata", intl)}</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
