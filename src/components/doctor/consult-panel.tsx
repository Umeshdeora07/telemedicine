import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { AlertTriangle, FileText, History, Pill, ShieldAlert } from "lucide-react";
import { getDb, withRls } from "@/db";
import { appointments, consultNotes, documents, doctorClinicLinks, clinics, medicines, prescriptions, readings } from "@/db/schema";
import type { SessionUser } from "@/server/auth/session";
import type { RoomAccess } from "@/server/room";
import { getSpecialties } from "@/server/queries/reference";
import { getViewContext } from "@/server/context";
import { audit } from "@/server/audit";
import { Badge } from "@/components/ui/badge";
import { ageFrom } from "@/lib/utils";
import { ConsultTools, type Med } from "./consult-tools";

/** Everything the doctor needs during the consult (data loaded with row-level security). */
export async function ConsultPanel({ access, user }: { access: RoomAccess; user: SessionUser }) {
  const { t, fmt } = await getViewContext();
  const a = access.appointment;
  const p = access.patient;
  const db = await getDb();
  const rls = { userId: user.id, role: user.role };
  const data = await withRls(rls, async (tx) => {
    const [note] = await tx.select().from(consultNotes).where(eq(consultNotes.appointmentId, a.id));
    const docIds = a.preConsult?.documentIds ?? [];
    const docs = await tx
      .select()
      .from(documents)
      .where(docIds.length ? inArray(documents.id, docIds) : eq(documents.appointmentId, a.id));
    const attached = await tx.select().from(documents).where(eq(documents.appointmentId, a.id));
    const history = await tx
      .select({ n: consultNotes, at: appointments.startAt, mode: appointments.mode })
      .from(consultNotes)
      .innerJoin(appointments, eq(appointments.id, consultNotes.appointmentId))
      .where(and(eq(consultNotes.patientId, p.id), ne(consultNotes.appointmentId, a.id)))
      .orderBy(desc(appointments.startAt))
      .limit(6);
    const pastRx = await tx.select().from(prescriptions).where(and(eq(prescriptions.patientId, p.id), ne(prescriptions.appointmentId, a.id))).orderBy(desc(prescriptions.issuedAt)).limit(5);
    const rx = await tx.select({ id: prescriptions.id, number: prescriptions.number }).from(prescriptions).where(eq(prescriptions.appointmentId, a.id));
    const reads = await tx.select().from(readings).where(eq(readings.patientId, p.id)).orderBy(desc(readings.takenAt)).limit(12);
    const allDocs = [...docs, ...attached.filter((x) => !docs.some((d) => d.id === x.id))];
    return { note: note ?? null, docs: allDocs, history, pastRx, rx, reads };
  });
  await audit({ actor: { id: user.id, role: user.role }, action: "record.view", entityType: "patient", entityId: p.id, patientId: p.id, metadata: { context: "consult", appointmentId: a.id } });
  const meds = (await db.select().from(medicines).orderBy(asc(medicines.genericName))) as Med[];
  const clinicRows = await db
    .select({ id: clinics.id, name: clinics.name })
    .from(doctorClinicLinks)
    .innerJoin(clinics, eq(clinics.id, doctorClinicLinks.clinicId))
    .where(and(eq(doctorClinicLinks.doctorId, access.doctor.id), eq(doctorClinicLinks.active, true)));
  const specs = await getSpecialties();
  const age = ageFrom(p.dob);
  const allergies = [...new Set([...p.allergies, ...(a.preConsult?.allergies ?? "").split(/[,;\n]/).map((s) => s.trim())].filter((s) => s && !/^none$/i.test(s)))];
  const currentMeds = [...new Set([...p.currentMedicines, ...(a.preConsult?.currentMedicines ?? "").split(/[,;\n]/).map((s) => s.trim())].filter(Boolean))];
  const pc = a.preConsult;
  const n = data.note;

  return (
    <div className="divide-y divide-line">
      <section className="space-y-2 p-4" aria-labelledby="pt">
        <h2 id="pt" className="text-lg font-bold">{p.fullName}</h2>
        <p className="text-fg-muted">
          {age !== null ? t("{n} years", { n: age }) : t("Age not given")} · {p.sex ? t(p.sex === "female" ? "Female" : p.sex === "male" ? "Male" : "Other") : "—"} · {t("Consult location: {place}", { place: [a.patientLocationRegion, a.patientLocationCountry].filter(Boolean).join(", ") })}
        </p>
        <p className="text-sm text-fg-muted">
          {a.consultType === "follow_up" ? t("Follow-up") : t("First consult")} · {t(a.mode)} · {a.ref}
          {a.bookedByRole === "caregiver" ? ` · ${t("Booked by a family member")}` : ""}
          {a.interpreterLanguage ? ` · ${t("Interpreter requested: {lang}", { lang: a.interpreterLanguage })}` : ""}
        </p>
        {allergies.length ? (
          <p className="flex flex-wrap items-center gap-1.5">
            <ShieldAlert className="size-4 text-danger" aria-hidden />
            <span className="font-semibold text-danger">{t("Allergies:")}</span>
            {allergies.map((x) => <Badge key={x} tone="danger">{x}</Badge>)}
          </p>
        ) : <p className="text-sm text-fg-muted">{t("No known allergies reported.")}</p>}
        {p.conditions.length ? <p className="text-sm"><strong>{t("Conditions:")}</strong> {p.conditions.join(", ")}</p> : null}
        {currentMeds.length ? <p className="flex items-start gap-1.5 text-sm"><Pill className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /><span><strong>{t("Current medicines:")}</strong> {currentMeds.join("; ")}</span></p> : null}
        {a.guardianPresent ? <p className="text-sm">{t("Guardian: {name} ({rel})", { name: a.guardianPresent.name, rel: a.guardianPresent.relationship })}</p> : null}
      </section>

      {pc || a.triage ? (
        <section className="space-y-2 p-4 text-[0.9375rem]" aria-labelledby="pre">
          <h3 id="pre" className="font-bold">{t("Patient's answers before the consult")}</h3>
          {pc ? (
            <dl className="space-y-1">
              <div><dt className="inline font-semibold">{t("Main problem")}: </dt><dd className="inline">{pc.mainProblem}</dd></div>
              <div><dt className="inline font-semibold">{t("Since")}: </dt><dd className="inline">{pc.since}</dd></div>
              {pc.pastConditions ? <div><dt className="inline font-semibold">{t("Past illnesses")}: </dt><dd className="inline">{pc.pastConditions}</dd></div> : null}
              {pc.questions ? <div><dt className="inline font-semibold">{t("Questions")}: </dt><dd className="inline">{pc.questions}</dd></div> : null}
              <div className="text-fg-muted">{pc.shareHistory ? t("Patient shared past records with you (30 days).") : t("Past records from other doctors are not shared.")}</div>
            </dl>
          ) : <p className="text-fg-muted">{t("The patient hasn't filled the pre-consult form.")}</p>}
          {a.triage ? (
            <p className="rounded-lg bg-surface-2 p-2 text-sm">
              <AlertTriangle className="me-1 inline size-4 text-warning" aria-hidden />
              {t("Symptom checker: urgency {u}", { u: t(a.triage.urgency.replace("_", " ")) })}
            </p>
          ) : null}
        </section>
      ) : null}

      {data.docs.length ? (
        <section className="space-y-2 p-4" aria-labelledby="docs">
          <h3 id="docs" className="font-bold">{t("Reports shared for this consult")}</h3>
          <ul className="space-y-1">
            {data.docs.map((d) => (
              <li key={d.id}>
                <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-primary hover:underline">
                  <FileText className="size-4" aria-hidden />{d.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.history.length || data.pastRx.length || data.reads.length ? (
        <details className="p-4">
          <summary className="tap flex cursor-pointer list-none items-center gap-2 font-bold">
            <History className="size-4" aria-hidden />{t("History ({n})", { n: data.history.length + data.pastRx.length })}
          </summary>
          <ul className="mt-2 space-y-2 text-sm">
            {data.history.map((h) => (
              <li key={h.n.id} className="rounded-lg bg-surface-2 p-2">
                <p className="font-semibold">{fmt.date(h.at)} · {h.n.diagnosis}</p>
                <p className="text-fg-muted">{h.n.advice}</p>
              </li>
            ))}
            {data.pastRx.map((r) => (
              <li key={r.id}>
                <a href={`/api/prescriptions/${r.id}/pdf`} target="_blank" rel="noopener" className="text-primary underline">{t("Prescription {n}", { n: r.number })}</a> · {fmt.date(r.issuedAt)} · {r.diagnosis}
              </li>
            ))}
            {data.reads.length ? (
              <li>
                <strong>{t("Recent readings:")}</strong>{" "}
                {data.reads.slice(0, 6).map((r) => `${r.type === "bp" ? `${r.value}/${r.value2}` : r.value} ${r.unit} (${fmt.date(r.takenAt, undefined, { day: "numeric", month: "short", year: undefined })})`).join(", ")}
              </li>
            ) : null}
          </ul>
        </details>
      ) : null}

      <ConsultTools
        apptId={a.id}
        mode={a.mode}
        consultType={a.consultType}
        allergies={allergies}
        currentMedicines={currentMeds}
        medicines={meds}
        identityConfirmed={Boolean(a.identityConfirmedAt)}
        isMinor={(age ?? 99) < 18}
        needsExplicitConsent={a.bookedByRole !== "patient" && !a.explicitConsentAt}
        clinics={clinicRows}
        specialties={specs.map((s) => ({ slug: s.slug, name: s.name }))}
        issuedRx={data.rx}
        status={a.status}
        initialNotes={{
          complaint: n?.complaint ?? pc?.mainProblem ?? a.chiefComplaint ?? "",
          history: n?.history ?? (pc ? `Since ${pc.since}. ${pc.pastConditions ? `Past: ${pc.pastConditions}.` : ""}` : ""),
          findings: n?.findings ?? "",
          diagnosis: n?.diagnosis ?? "",
          provisional: n?.provisional ?? true,
          advice: n?.advice ?? "",
          investigations: n?.investigations ?? [],
          warningSigns: n?.warningSigns ?? "",
          patientSummary: n?.patientSummary ?? "",
          privateNotes: n?.privateNotes ?? "",
          followUpDate: n?.followUpDate ?? null,
        }}
      />
    </div>
  );
}
