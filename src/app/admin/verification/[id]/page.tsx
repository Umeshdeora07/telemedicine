import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { getViewContext } from "@/server/context";
import { doctorForReview } from "@/server/admin";
import { audit } from "@/server/audit";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { DoctorDecisionForm, LicenceVerifyForm } from "@/components/admin/admin-forms";
import { humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Verify doctor" };

const LT = { pending: "warning", verified: "success", rejected: "danger", expired: "danger", suspended: "danger" } as const;

export default async function VerifyDoctor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const r = await doctorForReview(id);
  if (!r) notFound();
  await audit({ actor: { id: user!.id, role: user!.role }, action: "doctor.review_view", entityType: "doctor", entityId: id });
  const docsOf = (cat: string) => r.docs.filter((d) => d.category === cat);
  const docLink = (d: { id: string; title: string }) => (
    <a key={d.id} href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary underline"><FileText className="size-4" aria-hidden />{d.title}</a>
  );
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/verification" className="text-primary underline">{t("Back to queue")}</Link>
      <PageHeader eyebrow={t(r.specialty)} title={r.d.fullName} description={`${r.email ?? ""} · ${r.phone ?? ""} · ${t("{n} years experience", { n: r.d.experienceYears })}`} actions={<Badge tone={r.d.verificationStatus === "approved" ? "success" : r.d.verificationStatus === "submitted" ? "accent" : "neutral"}>{t(humanize(r.d.verificationStatus))}</Badge>} />
      {r.d.lastVerifiedAt ? <p className="text-fg-muted">{r.d.reverifyDueAt ? t("Last verified {date}. Next check due {due}.", { date: fmt.date(r.d.lastVerifiedAt), due: fmt.date(r.d.reverifyDueAt) }) : t("Last verified {date}.", { date: fmt.date(r.d.lastVerifiedAt) })}</p> : null}

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-bold">{t("What patients will see")}</h2>
        {r.missing.length ? <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning">{t("Still needed: {items}.", { items: r.missing.join(", ") })}</p> : null}
        <div className="flex flex-col gap-4 sm:flex-row">
          {r.d.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.d.photoUrl} alt={t("Profile photo")} width={120} height={120} className="size-30 shrink-0 rounded-2xl object-cover" />
          ) : (
            <Badge tone="danger">{t("No profile photo")}</Badge>
          )}
          <div className="min-w-0 space-y-2">
            {r.d.headline ? <p className="font-semibold text-heading">{r.d.headline}</p> : null}
            <p className="whitespace-pre-line text-fg-muted">{r.d.about || t("No profile text yet.")}</p>
            <p className="text-sm"><strong>{t("Languages")}:</strong> {r.d.languages.join(", ") || t("None")}</p>
            <p className="text-sm">
              <strong>{t("Fees")}:</strong>{" "}
              {r.fees.length ? r.fees.map((f) => `${t(humanize(f.mode))} ${fmt.money(f.amountMinor, f.currency)}`).join(", ") : t("None")}
            </p>
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-bold">{t("Payment details")}</h2>
        {r.d.paymentDetails ? (
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
            {(
              [
                [t("UPI ID"), r.d.paymentDetails.upiId],
                [t("Account holder"), r.d.paymentDetails.accountName],
                [t("Bank"), r.d.paymentDetails.bankName],
                [t("Account number"), r.d.paymentDetails.accountNumber],
                [t("IFSC code"), r.d.paymentDetails.ifsc],
                [t("SWIFT code"), r.d.paymentDetails.swift],
                [t("Other payment instructions"), r.d.paymentDetails.notes],
              ] as [string, string | undefined][]
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-fg-muted">{k}</dt>
                  <dd className="break-all">{v}</dd>
                </div>
              ))}
          </dl>
        ) : (
          <Badge tone="danger">{t("No payment details yet")}</Badge>
        )}
        {r.d.paymentDetails?.qrDocumentId ? docLink({ id: r.d.paymentDetails.qrDocumentId, title: t("UPI QR code") }) : null}
        <p className="text-sm text-fg-muted">{t("Patients pay the doctor directly. Check that the account holder name matches the doctor's name.")}</p>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-bold">{t("Identity")}</h2>
        <div className="flex flex-wrap gap-4">
          <div><p className="text-sm text-fg-muted">{t("Government ID")}</p>{docsOf("government_id").map(docLink)}{!docsOf("government_id").length ? <Badge tone="danger">{t("Missing")}</Badge> : null}</div>
          <div><p className="text-sm text-fg-muted">{t("Selfie")}</p>{docsOf("selfie").map(docLink)}{!docsOf("selfie").length ? <Badge tone="danger">{t("Missing")}</Badge> : null}</div>
          <div><p className="text-sm text-fg-muted">{t("Signature")}</p>{docsOf("signature").map(docLink)}{!docsOf("signature").length ? <Badge>{t("Not uploaded")}</Badge> : null}</div>
        </div>
        <p className="text-sm text-fg-muted">{t("Check the selfie matches the ID photo and the name matches the registration.")}</p>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-bold">{t("Qualifications")}</h2>
        <ul className="space-y-1">
          {r.quals.map((q) => <li key={q.id}><strong>{q.degree}</strong>, {q.institution}, {q.year} {q.documentId ? <a href={`/api/documents/${q.documentId}`} target="_blank" rel="noopener" className="ms-2 text-primary underline">{t("certificate")}</a> : <Badge tone="warning">{t("no certificate")}</Badge>}</li>)}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("Registration")}</h2>
        {r.lic.map((l) => (
          <div key={l.id} className="card space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <strong>{[l.region, l.country].filter(Boolean).join(", ")}</strong> · {l.issuingBody} · {l.number}
              <Badge tone={LT[l.status]} className="ms-auto">{t(humanize(l.status))}</Badge>
            </div>
            <p className="text-sm text-fg-muted">
              {l.expiresAt ? t("Valid until {date}", { date: fmt.date(l.expiresAt) }) : t("No expiry date")}
              {l.verifiedAt ? ` · ${t("checked {date}: {ref}", { date: fmt.date(l.verifiedAt), ref: l.verificationReference ?? "" })}` : ""}
            </p>
            {l.certificateDocumentId ? <a href={`/api/documents/${l.certificateDocumentId}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary underline"><FileText className="size-4" aria-hidden />{t("Registration certificate")}</a> : <Badge tone="warning">{t("No certificate uploaded")}</Badge>}
            <LicenceVerifyForm doctorId={r.d.id} licenceId={l.id} current={l.status} />
          </div>
        ))}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-bold">{t("Decision")}</h2>
        {r.d.rejectionReason ? <p className="text-sm text-danger">{t("Last reason: {r}", { r: r.d.rejectionReason })}</p> : null}
        <DoctorDecisionForm doctorId={r.d.id} status={r.d.verificationStatus} />
      </section>

      <section className="card space-y-2 p-5">
        <h2 className="text-lg font-bold">{t("History")}</h2>
        <ul className="space-y-1 text-sm">
          {r.history.map(({ l, name }) => <li key={l.id}>{fmt.dateTime(l.createdAt)} · <strong>{name ?? t("system")}</strong> · {l.action}{l.metadata && (l.metadata as { reference?: string }).reference ? ` · ${(l.metadata as { reference?: string }).reference}` : ""}</li>)}
        </ul>
      </section>
    </div>
  );
}
