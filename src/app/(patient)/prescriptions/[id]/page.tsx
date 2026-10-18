import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ShieldCheck } from "lucide-react";
import { getViewContext } from "@/server/context";
import { prescriptionForUser } from "@/server/patient-app";
import { FREQUENCIES, TIMINGS } from "@/lib/tpg";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Prescription" };

export default async function PrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const r = await prescriptionForUser(ctx.user!, id);
  if (!r) notFound();
  const { rx, items } = r;
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        eyebrow={rx.number}
        title={rx.diagnosis || t("Prescription")}
        description={t("{doctor} for {patient} · {date}", { doctor: r.doctorName, patient: r.patientName, date: fmt.date(rx.issuedAt) })}
        actions={<ButtonLink href={`/api/prescriptions/${rx.id}/pdf`} target="_blank" variant="secondary"><Download className="size-5" aria-hidden />{t("Download PDF")}</ButtonLink>}
      />
      {rx.status === "cancelled" ? <Alert tone="danger" title={t("This prescription was cancelled by the doctor")}>{t("Do not use it. Check your consultation for a new one.")}</Alert> : null}
      <section className="space-y-3" aria-labelledby="meds">
        <h2 id="meds" className="text-lg font-bold">{t("Medicines")}</h2>
        <ol className="space-y-3">
          {items.map((i, n) => (
            <li key={i.id} className="card space-y-1 p-4">
              <p className="text-lg font-bold">{n + 1}. {i.name} {i.strength} <span className="text-base font-normal text-fg-muted">({t(i.form)})</span></p>
              <p><strong>{i.dose}</strong> · {t(FREQUENCIES[i.frequency]?.label ?? i.frequency)}{TIMINGS[i.timing] ? ` · ${t(TIMINGS[i.timing]!)}` : ""} · {t("for {n} days", { n: i.durationDays })}</p>
              {i.instructions ? <p className="text-fg-muted">{i.instructions}</p> : null}
            </li>
          ))}
        </ol>
      </section>
      {rx.advice ? <section className="card space-y-1 p-5"><h2 className="text-lg font-bold">{t("Advice")}</h2><p className="whitespace-pre-line">{rx.advice}</p></section> : null}
      {rx.investigations.length ? <section className="card space-y-1 p-5"><h2 className="text-lg font-bold">{t("Tests advised")}</h2><ul className="list-disc ps-5">{rx.investigations.map((x) => <li key={x}>{x}</li>)}</ul></section> : null}
      {rx.followUpDate ? <p>{t("Follow up: {date}", { date: fmt.date(rx.followUpDate) })}</p> : null}
      {ctx.user!.countryCode !== "IN" ? <Alert tone="info">{t("Your doctor is registered in India. If you live outside India, a prescription from an Indian doctor may not be accepted by pharmacies in your country. Your doctor will give you a written treatment plan that you can share with your local doctor.")}</Alert> : null}
      <p className="flex items-start gap-2 text-sm text-fg-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span>{t("Digitally signed. A pharmacist can scan the QR code on the PDF, or check it at")} <Link href={`/verify/rx/${rx.number}`} className="text-primary underline">{t("our verification page")}</Link>.</span>
      </p>
    </div>
  );
}
