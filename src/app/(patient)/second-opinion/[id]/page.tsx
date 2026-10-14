import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { FileText } from "lucide-react";
import { getDb, withRls } from "@/db";
import { doctors, documents, secondOpinions } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { myPatientIds } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Second opinion" };

export default async function SecondOpinionDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const db = await getDb();
  const [s] = await db.select().from(secondOpinions).where(eq(secondOpinions.id, id));
  if (!s || !(await myPatientIds(user!.id, "records")).includes(s.patientId)) notFound();
  const [doc] = s.doctorId ? await db.select({ fullName: doctors.fullName, slug: doctors.slug }).from(doctors).where(eq(doctors.id, s.doctorId)) : [];
  const files = s.documentIds.length ? await withRls({ userId: user!.id, role: user!.role }, (tx) => tx.select().from(documents).where(inArray(documents.id, s.documentIds))) : [];
  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/second-opinion" className="text-primary underline">{t("All requests")}</Link>
      <PageHeader eyebrow={s.ref} title={t("Second opinion")} description={fmt.date(s.createdAt)} />
      {sp.paid ? <Alert tone="success">{t("Payment received. We're assigning a senior specialist.")}</Alert> : null}
      {s.status === "pending_payment" ? <Alert tone="warning">{t("We haven't received payment for this request yet.")}</Alert> : null}
      {s.status === "assigned" || s.status === "submitted" ? <Alert tone="info" title={doc ? t("{doctor} is reviewing your reports", { doctor: doc.fullName }) : t("Finding the right specialist")}>{s.dueAt ? t("You'll have the opinion by {date}.", { date: fmt.dateTime(s.dueAt) }) : null}</Alert> : null}
      <section className="card space-y-2 p-5">
        <h2 className="text-lg font-bold">{t("Your question")}</h2>
        <p className="whitespace-pre-line">{s.question}</p>
        <ul className="space-y-1">{files.map((f) => <li key={f.id}><a href={`/api/documents/${f.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary underline"><FileText className="size-4" aria-hidden />{f.title}</a></li>)}</ul>
      </section>
      {s.status === "answered" ? (
        <section className="card space-y-3 border-success p-5">
          <h2 className="text-lg font-bold">{t("Opinion from {doctor}", { doctor: doc?.fullName ?? "" })}</h2>
          <p className="text-sm text-fg-muted">{fmt.dateTime(s.answeredAt!)}</p>
          <p className="whitespace-pre-line">{s.opinion}</p>
          {s.recommendations ? <><h3 className="font-bold">{t("Recommendations")}</h3><p className="whitespace-pre-line">{s.recommendations}</p></> : null}
          <p className="text-sm text-fg-muted">{t("This is advice based on reports only, not a prescription. Discuss it with your treating doctor.")}</p>
          {doc ? <ButtonLink href={`/book/${doc.slug}`} variant="secondary">{t("Book a video consult with {doctor}", { doctor: doc.fullName })}</ButtonLink> : null}
        </section>
      ) : null}
    </div>
  );
}
