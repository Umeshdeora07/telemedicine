import type { Metadata } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { CheckCircle2, Circle, Clock, FileText, ShieldCheck } from "lucide-react";
import { getDb } from "@/db";
import { availabilityRules, doctorFees, doctorLicences, doctorQualifications, documents, specialties } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { doctorForUser } from "@/server/consult";
import { getSpecialties } from "@/server/queries/reference";
import { missingForVerification } from "@/server/doctor-verification";
import { acceptsDirectPayment } from "@/lib/direct-payment";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { BasicsForm, IdentityUploads, LicenceForm, QualificationForm, SubmitForVerification } from "@/components/doctor/onboarding-forms";
import type { Uploaded } from "@/components/common/file-uploader";
import { humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Get verified" };

const LIC_TONE = { pending: "warning", verified: "success", rejected: "danger", expired: "danger", suspended: "danger" } as const;

export default async function DoctorOnboarding() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const d = (await doctorForUser(ctx.user!))!;
  const db = await getDb();
  const [quals, lic, docs, [spec], specs, fees, rules, missing] = await Promise.all([
    db.select().from(doctorQualifications).where(eq(doctorQualifications.doctorId, d.id)),
    db.select().from(doctorLicences).where(eq(doctorLicences.doctorId, d.id)),
    db.select().from(documents).where(and(eq(documents.doctorId, d.id), isNull(documents.deletedAt))),
    db.select({ slug: specialties.slug }).from(specialties).where(eq(specialties.id, d.specialtyId)),
    getSpecialties(),
    db.select().from(doctorFees).where(eq(doctorFees.doctorId, d.id)),
    db.select({ id: availabilityRules.id }).from(availabilityRules).where(eq(availabilityRules.doctorId, d.id)),
    missingForVerification(db, d, t),
  ]);
  const byCat = (c: string): Uploaded[] => docs.filter((x) => x.category === c).map((x) => ({ id: x.id, title: x.title, mimeType: x.mimeType, sizeBytes: x.sizeBytes }));
  const has = (c: string) => docs.some((x) => x.category === c);
  const steps = [
    { label: t("Basic details"), done: Boolean(d.fullName && spec) },
    { label: t("Qualification with degree certificate"), done: quals.length > 0 && has("degree_certificate") },
    { label: t("Indian registration with certificate"), done: lic.length > 0 && has("registration_certificate") },
    { label: t("Government ID and selfie"), done: has("government_id") && has("selfie") },
    { label: t("Profile photo, about you and languages"), done: Boolean(d.photoUrl && d.about.trim().length >= 80 && d.languages.length) },
    { label: t("Video consultation fee"), done: fees.some((f) => f.mode === "video" && f.amountMinor > 0) },
    { label: t("Available times"), done: rules.length > 0 },
    { label: t("Signature for prescriptions"), done: Boolean(d.signatureDocumentId) },
    { label: t("Payment details (UPI or bank account)"), done: acceptsDirectPayment(d.paymentDetails) },
  ];
  const ready = missing.length === 0;
  const status = d.verificationStatus;
  const locked = status === "submitted" || status === "approved";

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        eyebrow={t("Doctor verification")}
        title={t("Get verified to start consulting")}
        description={t("We check every doctor's registration with the medical council before patients can see them.")}
      />

      {status === "submitted" ? (
        <Alert tone="info" title={d.submittedAt ? t("Submitted on {date}", { date: fmt.date(d.submittedAt) }) : t("Submitted")}>
          {t("Our verification team is checking your documents with the council. We'll message you when it's done. You can still edit your profile and fees.")}
        </Alert>
      ) : status === "rejected" ? (
        <Alert tone="danger" title={t("We couldn't verify you yet")}>
          {d.rejectionReason ?? t("Please check your documents and submit again.")}
        </Alert>
      ) : status === "suspended" ? (
        <Alert tone="danger" title={t("Your account is paused")}>{t("Please contact the verification team at the help centre.")}</Alert>
      ) : null}

      <ol className="card divide-y divide-line" aria-label={t("Verification checklist")}>
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-3 p-4">
            {s.done ? <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden /> : <Circle className="size-6 shrink-0 text-fg-muted" aria-hidden />}
            <span className="font-medium">{s.label}</span>
            <span className="sr-only">{s.done ? t("Done") : t("Not done")}</span>
          </li>
        ))}
      </ol>

      <section className="card space-y-4 p-5" aria-labelledby="basics">
        <h2 id="basics" className="text-xl font-bold">{t("1. Basic details")}</h2>
        <BasicsForm p={{ fullName: d.fullName, gender: d.gender, specialty: spec?.slug ?? specs[0]!.slug, experienceYears: d.experienceYears }} specialties={specs.map((s) => ({ slug: s.slug, name: s.name }))} />
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="quals">
        <h2 id="quals" className="text-xl font-bold">{t("2. Qualifications")}</h2>
        {quals.length ? (
          <ul className="space-y-2">
            {quals.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-3">
                <strong>{q.degree}</strong> · {q.institution} · {q.year}
                {q.documentId ? <a href={`/api/documents/${q.documentId}`} target="_blank" rel="noopener" className="ms-auto inline-flex items-center gap-1 text-primary underline"><FileText className="size-4" aria-hidden />{t("Certificate")}</a> : <Badge tone="warning" className="ms-auto">{t("Certificate missing")}</Badge>}
              </li>
            ))}
          </ul>
        ) : null}
        {!locked ? <QualificationForm /> : null}
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="lic">
        <h2 id="lic" className="text-xl font-bold">{t("3. Medical registration")}</h2>
        <p className="text-fg-muted">{t("Add your Indian registration with the National Medical Commission or your State Medical Council. Psychologists add their Rehabilitation Council of India registration. Patients see you only after we verify it.")}</p>
        {lic.length ? (
          <ul className="space-y-2">
            {lic.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 p-3">
                <ShieldCheck className="size-5 text-primary" aria-hidden />
                <strong>{l.issuingBody}</strong> · {l.number}
                {l.expiresAt ? <span className="text-sm text-fg-muted">{t("valid until {date}", { date: fmt.date(l.expiresAt) })}</span> : null}
                <Badge tone={LIC_TONE[l.status]} className="ms-auto">{t(humanize(l.status))}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
        {!locked ? <LicenceForm /> : null}
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="id">
        <h2 id="id" className="text-xl font-bold">{t("4. Identity")}</h2>
        <IdentityUploads initial={{ government_id: byCat("government_id"), selfie: byCat("selfie") }} />
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="profile">
        <h2 id="profile" className="text-xl font-bold">{t("5. Profile photo, about you, fees, payment details and signature")}</h2>
        <p className="text-fg-muted">{t("Upload a clear photo, write a few lines about yourself in plain words, choose your languages, set your consultation and treatment fees, add your UPI or bank details so patients can pay you, and upload your signature. Your prescriptions carry this signature and your registration number.")}</p>
        <ButtonLink href="/doctor/profile" variant="secondary">{t("Open profile and fees")}</ButtonLink>
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="times">
        <h2 id="times" className="text-xl font-bold">{t("6. Available times")}</h2>
        <p className="text-fg-muted">{t("Set the days and hours when patients can book a video consultation with you.")}</p>
        <ButtonLink href="/doctor/schedule" variant="secondary">{t("Set available times")}</ButtonLink>
      </section>

      {status === "draft" || status === "rejected" ? (
        <section className="card space-y-3 border-primary p-5" aria-labelledby="submit">
          <h2 id="submit" className="text-xl font-bold">{t("Ready?")}</h2>
          <p className="text-fg-muted">{t("By submitting, you confirm the documents are genuine and you will follow the Telemedicine Practice Guidelines, 2020.")}</p>
          {!ready ? <p className="flex items-start gap-2 text-sm text-warning"><Clock className="mt-0.5 size-4 shrink-0" aria-hidden />{t("Still needed: {items}.", { items: missing.join(", ") })}</p> : null}
          <SubmitForVerification disabled={!ready} />
        </section>
      ) : status === "approved" ? (
        <Alert tone="success" title={t("You're verified")}>{t("Patients can now find and book you.")}</Alert>
      ) : null}
    </div>
  );
}
