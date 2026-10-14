import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Receipt, ShieldAlert, Video } from "lucide-react";
import { getViewContext } from "@/server/context";
import { clinicVisit, currentClinic } from "@/server/clinic-portal";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { DeskActions } from "@/components/clinic/desk-actions";
import { ageFrom, maskPhone } from "@/lib/utils";
import { statusBadge } from "@/components/patient/appointment-card";

export const metadata: Metadata = { title: "Visit" };

export default async function ClinicVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const clinic = (await currentClinic(user!))!;
  const v = await clinicVisit(user!, clinic, id);
  if (!v) notFound();
  const { a, p } = v;
  const paid = v.payments.find((x) => x.status === "captured");
  const needsPayment = a.paymentMode === "at_clinic" && !paid && ["confirmed", "checked_in", "in_progress", "completed"].includes(a.status);
  const age = ageFrom(p.dob);
  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/clinic" className="text-primary underline">{t("Back to today")}</Link>
      <PageHeader
        eyebrow={a.ref}
        title={p.fullName}
        description={[age !== null ? t("{n} years", { n: age }) : null, p.sex ? t(p.sex === "female" ? "Female" : p.sex === "male" ? "Male" : "Other") : null, v.bookedByPhone ? maskPhone(v.bookedByPhone) : null].filter(Boolean).join(" · ")}
        actions={statusBadge(a.status, t)}
      />
      <section className="card grid gap-3 p-5 sm:grid-cols-2">
        <p><span className="block text-sm text-fg-muted">{t("Doctor")}</span><strong>{v.doctorName}</strong></p>
        <p><span className="block text-sm text-fg-muted">{t("Time")}</span><strong>{fmt.dateTime(a.startAt, clinic.timeZone)}</strong></p>
        <p><span className="block text-sm text-fg-muted">{t("Booked by")}</span>{v.bookedByName}{a.bookedByRole === "caregiver" ? ` (${t("family member")})` : ""}</p>
        <p><span className="block text-sm text-fg-muted">{t("Checked in")}</span>{a.checkedInAt ? fmt.time(a.checkedInAt, clinic.timeZone) : "—"}</p>
        {p.allergies.length ? <p className="flex items-center gap-1.5 sm:col-span-2"><ShieldAlert className="size-4 text-danger" aria-hidden /><strong className="text-danger">{t("Allergies:")}</strong> {p.allergies.join(", ")}</p> : null}
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="desk">
        <h2 id="desk" className="text-lg font-bold">{t("Reception")}</h2>
        {paid ? (
          <p className="flex flex-wrap items-center gap-2">
            <Badge tone="success">{t("Paid")}</Badge>
            {fmt.money(paid.amountMinor, paid.currency)} · {paid.gateway === "clinic_desk" ? t("at the desk") : t("online")}
            {paid.invoiceNumber ? <a href={`/api/invoices/${paid.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary underline"><Receipt className="size-4" aria-hidden />{paid.invoiceNumber}</a> : null}
          </p>
        ) : null}
        {a.creditMinor > 0 ? <Alert tone="info">{t("The online consult fee ({amount}) was credited to this visit.", { amount: fmt.money(a.creditMinor, a.currency) })}</Alert> : null}
        <DeskActions apptId={a.id} code={a.visitPassCode} canCheckIn={a.status === "confirmed"} needsPayment={needsPayment} amount={fmt.money(a.totalMinor, a.currency)} />
      </section>

      {v.parent ? (
        <section className="card space-y-3 p-5" aria-labelledby="online">
          <h2 id="online" className="flex items-center gap-2 text-lg font-bold"><Video className="size-5 text-primary" aria-hidden />{t("From the online consult")}</h2>
          <p className="text-sm text-fg-muted">{t("{doctor} · {date} · shared with the clinic for this visit", { doctor: v.parent.doctorName, date: fmt.date(v.parent.a.startAt, clinic.timeZone) })}</p>
          {v.parent.note ? (
            <dl className="space-y-2">
              <div><dt className="font-semibold">{t("Main problem")}</dt><dd>{v.parent.note.complaint}</dd></div>
              <div><dt className="font-semibold">{t("Diagnosis")}</dt><dd>{v.parent.note.diagnosis}{v.parent.note.provisional ? ` (${t("provisional")})` : ""}</dd></div>
              {v.parent.note.investigations.length ? <div><dt className="font-semibold">{t("Tests advised")}</dt><dd>{v.parent.note.investigations.join(", ")}</dd></div> : null}
              {v.parent.note.advice ? <div><dt className="font-semibold">{t("Advice")}</dt><dd className="whitespace-pre-line">{v.parent.note.advice}</dd></div> : null}
            </dl>
          ) : <p className="text-fg-muted">{t("No notes were saved for the online consult.")}</p>}
          <p className="flex items-center gap-1.5 text-sm text-fg-muted"><FileText className="size-4" aria-hidden />{t("The doctor sees the full record, reports and prescriptions in their visit view.")}</p>
        </section>
      ) : null}
    </div>
  );
}
