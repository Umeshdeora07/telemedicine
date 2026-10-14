import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getRoomAccess } from "@/server/room";
import { getViewContext } from "@/server/context";
import { getDb, withRls } from "@/db";
import { appointments, consultNotes } from "@/db/schema";
import { ConsultPanel } from "@/components/doctor/consult-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Clinic visit" };

/** In-clinic visit: the doctor sees the online consult that led here, and writes notes and prescriptions. */
export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getViewContext();
  const access = await getRoomAccess(id);
  if (!access || access.role !== "doctor") notFound();
  const { t, fmt } = ctx;
  const a = access.appointment;
  const db = await getDb();
  const [parent] = a.parentAppointmentId ? await db.select().from(appointments).where(eq(appointments.id, a.parentAppointmentId)) : [];
  const parentNote = parent
    ? await withRls({ userId: ctx.user!.id, role: ctx.user!.role }, async (tx) => (await tx.select().from(consultNotes).where(and(eq(consultNotes.appointmentId, parent.id))))[0] ?? null)
    : null;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <nav className="text-sm text-fg-muted"><Link href="/doctor" className="hover:underline">{t("Today")}</Link> › {a.ref}</nav>
      <PageHeader title={t("Clinic visit: {name}", { name: access.patient.fullName })} description={`${fmt.dateTime(a.startAt, access.doctor.timeZone)} · ${a.status === "checked_in" ? t("Checked in") : t(humanize(a.status))}`} />
      {parent && parentNote ? (
        <Alert tone="info" title={t("From the online consult on {date}", { date: fmt.date(parent.startAt) })}>
          <strong>{parentNote.diagnosis}</strong> — {parentNote.findings} {parentNote.advice}
        </Alert>
      ) : null}
      <div className="card overflow-hidden">
        <ConsultPanel access={access} user={ctx.user!} />
      </div>
    </div>
  );
}
