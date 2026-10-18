import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getViewContext } from "@/server/context";
import { getAppointmentForUser } from "@/server/patient";
import { getDb } from "@/db";
import { documents, patients } from "@/db/schema";
import { PreConsultForm } from "@/components/booking/pre-consult-form";
import { PageHeader } from "@/components/ui/page-header";
import { ageFrom } from "@/lib/utils";

export const metadata: Metadata = { title: "Health form" };

export default async function PreparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getViewContext();
  const row = await getAppointmentForUser(ctx.user!, id);
  if (!row) notFound();
  const db = await getDb();
  const [p] = await db.select().from(patients).where(eq(patients.id, row.a.patientId));
  const uploaded = await db.select().from(documents).where(and(eq(documents.appointmentId, id), isNull(documents.deletedAt)));
  const pc = row.a.preConsult;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title={ctx.t("Tell {doctor} what's going on", { doctor: row.doctorName })} description={ctx.t("For {name}. You can update this at any time before the consultation.", { name: row.patientName })} />
      <div className="card p-5 sm:p-6">
        <PreConsultForm
          apptId={id}
          patientName={row.patientName}
          doctorName={row.doctorName}
          isMinor={(ageFrom(p?.dob) ?? 99) < 18}
          nextHref={`/consults/${id}`}
          uploaded={uploaded.map((u) => ({ id: u.id, title: u.title, mimeType: u.mimeType, sizeBytes: u.sizeBytes }))}
          defaults={{
            mainProblem: pc?.mainProblem ?? row.a.chiefComplaint ?? "",
            since: pc?.since ?? "",
            currentMedicines: pc?.currentMedicines ?? p?.currentMedicines.join(", ") ?? "",
            allergies: pc?.allergies ?? p?.allergies.join(", ") ?? "",
            pastConditions: pc?.pastConditions ?? p?.conditions.join(", ") ?? "",
            questions: pc?.questions ?? "",
            shareHistory: pc?.shareHistory ?? false,
          }}
        />
      </div>
    </div>
  );
}
