import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { FileText } from "lucide-react";
import { getDb, withRls } from "@/db";
import { documents, patients, secondOpinions } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { doctorForUser } from "@/server/consult";
import { audit } from "@/server/audit";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { SecondOpinionForm } from "@/components/doctor/second-opinion-form";
import { ageFrom } from "@/lib/utils";

export const metadata: Metadata = { title: "Second opinion" };

export default async function DoctorSecondOpinion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const d = (await doctorForUser(user!))!;
  const db = await getDb();
  const [s] = await db.select().from(secondOpinions).where(and(eq(secondOpinions.id, id), eq(secondOpinions.doctorId, d.id)));
  if (!s) notFound();
  const { p, docs } = await withRls({ userId: user!.id, role: user!.role }, async (tx) => ({
    p: (await tx.select().from(patients).where(eq(patients.id, s.patientId)))[0] ?? null,
    docs: s.documentIds.length ? await tx.select().from(documents).where(inArray(documents.id, s.documentIds)) : [],
  }));
  await audit({ actor: { id: user!.id, role: user!.role }, action: "record.view", entityType: "second_opinion", entityId: s.id, patientId: s.patientId });
  const age = p ? ageFrom(p.dob) : null;
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        eyebrow={s.ref}
        title={t("Second opinion for {name}", { name: p?.fullName ?? t("patient") })}
        description={[age !== null ? t("{n} years", { n: age }) : null, p?.sex ? t(p.sex === "female" ? "Female" : p.sex === "male" ? "Male" : "Other") : null, t("Located in {place}", { place: [s.patientLocationRegion, s.patientLocationCountry].filter(Boolean).join(", ") })].filter(Boolean).join(" · ")}
      />
      {s.dueAt && s.status === "assigned" ? <Alert tone={s.dueAt < new Date() ? "danger" : "info"}>{t("Please answer by {date}.", { date: fmt.dateTime(s.dueAt, d.timeZone) })}</Alert> : null}
      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-bold">{t("The patient's question")}</h2>
        <p className="whitespace-pre-line">{s.question}</p>
        {s.history ? (
          <>
            <h3 className="font-bold">{t("History")}</h3>
            <p className="whitespace-pre-line">{s.history}</p>
          </>
        ) : null}
        {p?.allergies.length ? <p><strong>{t("Allergies:")}</strong> {p.allergies.join(", ")}</p> : null}
        {p?.conditions.length ? <p><strong>{t("Conditions:")}</strong> {p.conditions.join(", ")}</p> : null}
      </section>
      <section className="card space-y-2 p-5">
        <h2 className="text-lg font-bold">{t("Reports ({n})", { n: docs.length })}</h2>
        <ul className="space-y-1">
          {docs.map((x) => (
            <li key={x.id}>
              <a href={`/api/documents/${x.id}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-primary underline"><FileText className="size-4" aria-hidden />{x.title}</a>
            </li>
          ))}
        </ul>
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-bold">{t("Your written opinion")}</h2>
        {s.status === "answered" ? (
          <>
            <p className="text-sm text-fg-muted">{t("Sent on {date}", { date: fmt.dateTime(s.answeredAt!) })}</p>
            <p className="whitespace-pre-line">{s.opinion}</p>
            {s.recommendations ? <><h3 className="font-bold">{t("Recommendations")}</h3><p className="whitespace-pre-line">{s.recommendations}</p></> : null}
          </>
        ) : (
          <SecondOpinionForm id={s.id} />
        )}
      </section>
    </div>
  );
}
