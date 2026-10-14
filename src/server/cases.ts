import "server-only";
import { and, asc, desc, eq, inArray, ne, or } from "drizzle-orm";
import { getDb, type Executor } from "@/db";
import { caseEstimates, caseEvents, clinicStaff, clinics, documents, doctors, internationalCases, messages, patients, payments, specialties, users, visaLetters } from "@/db/schema";
import type { SessionUser } from "@/server/auth/session";
import { myPatientIds } from "@/server/patient";
import { notifyUser } from "@/server/notify";
import { audit } from "@/server/audit";
import { getRate } from "@/server/queries/reference";
import { convertFromInr } from "@/lib/pricing";
import type { Currency } from "@/config/currencies";
import { refs } from "@/lib/ids";
import { encryptText } from "@/lib/crypto";
import { saveFile } from "@/lib/storage";
import { simplePdf } from "@/lib/pdf/simple";
import { brand } from "@/config/brand";

export type CaseStatus = (typeof internationalCases.$inferSelect)["status"];
export type CaseRow = typeof internationalCases.$inferSelect;

/** The patient-facing journey, in order. */
export const CASE_STEPS: { status: CaseStatus; label: string }[] = [
  { status: "received", label: "Enquiry received" },
  { status: "under_review", label: "Doctor reviewing reports" },
  { status: "plan_sent", label: "Plan and estimate sent" },
  { status: "accepted", label: "Plan accepted" },
  { status: "visa_letter_issued", label: "Visa letter issued" },
  { status: "travel_booked", label: "Travel booked" },
  { status: "arrived", label: "Arrived in India" },
  { status: "in_treatment", label: "In treatment" },
  { status: "discharged", label: "Discharged" },
  { status: "follow_up", label: "Follow-up from home" },
  { status: "closed", label: "Closed" },
];

export class CaseError extends Error {}

/** Clinics this coordinator works for. */
export async function staffClinicIds(userId: string) {
  const db = await getDb();
  return (await db.select({ id: clinicStaff.clinicId }).from(clinicStaff).where(eq(clinicStaff.userId, userId))).map((r) => r.id);
}

/** Who may see a case: the patient side, the assigned/preferred clinic, the assigned doctor, care coordinators and admins. */
export async function caseAccess(user: SessionUser, c: CaseRow): Promise<"patient" | "clinic" | "doctor" | "coordinator" | null> {
  if (user.role === "care_coordinator" || user.role === "super_admin") return "coordinator";
  if (user.role === "clinic_coordinator") {
    const ids = await staffClinicIds(user.id);
    return ids.includes(c.assignedClinicId ?? "") || ids.includes(c.preferredClinicId ?? "") ? "clinic" : null;
  }
  if (user.role === "doctor") {
    const db = await getDb();
    const [d] = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, user.id));
    return d && c.assignedDoctorId === d.id ? "doctor" : null;
  }
  const mine = await myPatientIds(user.id, "records");
  return mine.includes(c.patientId) ? "patient" : null;
}

export async function getCase(user: SessionUser, id: string) {
  const db = await getDb();
  const [c] = await db.select().from(internationalCases).where(eq(internationalCases.id, id));
  if (!c) return null;
  const access = await caseAccess(user, c);
  if (!access) return null;
  const [patient] = await db.select().from(patients).where(eq(patients.id, c.patientId));
  const [spec] = c.specialtyId ? await db.select().from(specialties).where(eq(specialties.id, c.specialtyId)) : [];
  const clinicId = c.assignedClinicId ?? c.preferredClinicId;
  const [clinic] = clinicId ? await db.select().from(clinics).where(eq(clinics.id, clinicId)) : [];
  const [doctor] = c.assignedDoctorId ? await db.select({ id: doctors.id, fullName: doctors.fullName, slug: doctors.slug }).from(doctors).where(eq(doctors.id, c.assignedDoctorId)) : [];
  const [coordinator] = c.coordinatorUserId ? await db.select({ name: users.name, phone: users.phone, email: users.email }).from(users).where(eq(users.id, c.coordinatorUserId)) : [];
  const events = await db
    .select()
    .from(caseEvents)
    .where(access === "patient" ? and(eq(caseEvents.caseId, c.id), eq(caseEvents.visibleToPatient, true)) : eq(caseEvents.caseId, c.id))
    .orderBy(asc(caseEvents.createdAt));
  const estimates = await db.select().from(caseEstimates).where(and(eq(caseEstimates.caseId, c.id), ne(caseEstimates.status, "draft"))).orderBy(desc(caseEstimates.createdAt));
  const docs = await db.select().from(documents).where(and(eq(documents.caseId, c.id))).orderBy(desc(documents.createdAt));
  const thread = await db.select().from(messages).where(eq(messages.caseId, c.id)).orderBy(asc(messages.id)).limit(300);
  const letters = await db.select().from(visaLetters).where(eq(visaLetters.caseId, c.id)).orderBy(desc(visaLetters.issuedAt));
  const pays = await db.select().from(payments).where(eq(payments.caseId, c.id)).orderBy(desc(payments.createdAt));
  await audit({ actor: { id: user.id, role: user.role }, action: "record.view", entityType: "international_case", entityId: c.id, patientId: c.patientId });
  return { c, access, patient: patient!, specialty: spec ?? null, clinic: clinic ?? null, doctor: doctor ?? null, coordinator: coordinator ?? null, events, estimates, docs: docs.filter((d) => !d.deletedAt), thread, letters, payments: pays };
}

export async function listCasesForStaff(user: SessionUser) {
  const db = await getDb();
  const base = db
    .select({ c: internationalCases, patientName: patients.fullName, clinicName: clinics.name })
    .from(internationalCases)
    .innerJoin(patients, eq(patients.id, internationalCases.patientId))
    .leftJoin(clinics, eq(clinics.id, internationalCases.assignedClinicId));
  if (user.role === "clinic_coordinator") {
    const ids = await staffClinicIds(user.id);
    if (!ids.length) return [];
    return base.where(or(inArray(internationalCases.assignedClinicId, ids), inArray(internationalCases.preferredClinicId, ids))).orderBy(desc(internationalCases.updatedAt));
  }
  return base.orderBy(desc(internationalCases.updatedAt));
}

export async function listCasesForPatientUser(userId: string) {
  const db = await getDb();
  const ids = await myPatientIds(userId, "records");
  if (!ids.length) return [];
  return db
    .select({ c: internationalCases, patientName: patients.fullName, clinicName: clinics.name })
    .from(internationalCases)
    .innerJoin(patients, eq(patients.id, internationalCases.patientId))
    .leftJoin(clinics, eq(clinics.id, internationalCases.assignedClinicId))
    .where(inArray(internationalCases.patientId, ids))
    .orderBy(desc(internationalCases.updatedAt));
}

async function addEvent(db: Executor, c: CaseRow, user: SessionUser | null, note: string, status: CaseStatus | null, visibleToPatient = true) {
  await db.insert(caseEvents).values({ caseId: c.id, status, note, visibleToPatient, actorUserId: user?.id ?? null, actorRole: user?.role ?? "system" });
  if (status) await db.update(internationalCases).set({ status, updatedAt: new Date() }).where(eq(internationalCases.id, c.id));
  else await db.update(internationalCases).set({ updatedAt: new Date() }).where(eq(internationalCases.id, c.id));
  if (visibleToPatient) await notifyUser(db, c.createdByUserId, { template: "case_update", title: `Update on your case ${c.ref}`, body: note, link: `/international/cases/${c.id}` });
}

/** Hospital desk staff and the care coordinator, each with a link into their own portal. */
async function staffRecipients(db: Executor, c: CaseRow) {
  const clinicId = c.assignedClinicId ?? c.preferredClinicId;
  const staff = clinicId ? await db.select({ userId: clinicStaff.userId }).from(clinicStaff).where(eq(clinicStaff.clinicId, clinicId)) : [];
  return [
    ...staff.map((s) => ({ userId: s.userId, link: `/clinic/cases/${c.id}` })),
    ...(c.coordinatorUserId ? [{ userId: c.coordinatorUserId, link: `/coordinator/cases/${c.id}` }] : []),
  ];
}

async function staffCase(user: SessionUser, id: string) {
  const db = await getDb();
  const [c] = await db.select().from(internationalCases).where(eq(internationalCases.id, id));
  if (!c) throw new CaseError("Case not found.");
  const access = await caseAccess(user, c);
  if (access !== "clinic" && access !== "coordinator") throw new CaseError("Not allowed.");
  return { db, c };
}

/** Patient (or family) starts a treatment-in-India enquiry. */
export async function createCase(user: SessionUser, input: { patientId: string; homeCountry: string; currency: Currency; specialtyId: string | null; treatmentInterest: string; description: string; preferredClinicId: string | null; preferredLanguage: string | null; documentIds: string[] }) {
  const db = await getDb();
  const mine = await myPatientIds(user.id, "book");
  if (!mine.includes(input.patientId)) throw new CaseError("Not allowed.");
  const [coord] = await db.select({ id: users.id }).from(users).where(eq(users.role, "care_coordinator")).limit(1);
  const [c] = await db
    .insert(internationalCases)
    .values({ ref: refs.internationalCase(), patientId: input.patientId, createdByUserId: user.id, homeCountry: input.homeCountry, currency: input.currency, specialtyId: input.specialtyId, treatmentInterest: input.treatmentInterest, description: input.description, preferredClinicId: input.preferredClinicId, assignedClinicId: input.preferredClinicId, coordinatorUserId: coord?.id ?? null, preferredLanguage: input.preferredLanguage })
    .returning();
  if (input.documentIds.length) await db.update(documents).set({ caseId: c!.id }).where(and(inArray(documents.id, input.documentIds), eq(documents.uploadedByUserId, user.id)));
  await db.insert(caseEvents).values({ caseId: c!.id, status: "received", note: "Enquiry received. A coordinator will review your reports within 24 hours.", actorRole: "system" });
  if (coord) await notifyUser(db, coord.id, { template: "case_new", title: `New international enquiry ${c!.ref}`, body: input.treatmentInterest, link: `/coordinator/cases/${c!.id}` });
  if (input.preferredClinicId) {
    const staff = await db.select({ userId: clinicStaff.userId }).from(clinicStaff).where(eq(clinicStaff.clinicId, input.preferredClinicId));
    for (const s of staff) await notifyUser(db, s.userId, { template: "case_new", title: `New international enquiry ${c!.ref}`, body: input.treatmentInterest, link: `/clinic/cases/${c!.id}` });
  }
  await audit({ actor: { id: user.id, role: user.role }, action: "case.create", entityType: "international_case", entityId: c!.id, patientId: input.patientId });
  return c!;
}

export async function assignCase(user: SessionUser, id: string, input: { clinicId: string | null; doctorId: string | null; note?: string }) {
  const { db, c } = await staffCase(user, id);
  await db.update(internationalCases).set({ assignedClinicId: input.clinicId ?? c.assignedClinicId, assignedDoctorId: input.doctorId ?? c.assignedDoctorId, updatedAt: new Date() }).where(eq(internationalCases.id, id));
  if (c.status === "received") await addEvent(db, c, user, input.note || "Reports complete. Sent to the specialist for review.", "under_review");
  await audit({ actor: { id: user.id, role: user.role }, action: "case.assign", entityType: "international_case", entityId: id, patientId: c.patientId, metadata: input });
}

/** Treatment plan with a cost range in INR, converted to the patient's currency at today's rate. */
export async function sendEstimate(
  user: SessionUser,
  id: string,
  e: { recommendedTreatment: string; rationale: string; hospitalDays: number; indiaDays: number; costMinInr: number; costMaxInr: number; depositInr: number; inclusions: string[]; exclusions: string[]; documentsNeeded: string[]; validDays: number; doctorId: string | null },
) {
  const { db, c } = await staffCase(user, id);
  const clinicId = c.assignedClinicId ?? c.preferredClinicId;
  if (!clinicId) throw new CaseError("Assign a hospital first.");
  const cur = c.currency as Currency;
  const { rate, asOf } = await getRate(cur);
  const toMinor = (inr: number) => Math.round(inr * 100);
  await db.update(caseEstimates).set({ status: "superseded" }).where(and(eq(caseEstimates.caseId, id), inArray(caseEstimates.status, ["sent", "draft"])));
  const valid = new Date(Date.now() + e.validDays * 86400_000).toISOString().slice(0, 10);
  const [est] = await db
    .insert(caseEstimates)
    .values({
      caseId: id,
      clinicId,
      doctorId: e.doctorId ?? c.assignedDoctorId,
      recommendedTreatment: e.recommendedTreatment,
      rationale: e.rationale,
      hospitalDays: e.hospitalDays,
      indiaDays: e.indiaDays,
      costMinInrMinor: toMinor(e.costMinInr),
      costMaxInrMinor: toMinor(e.costMaxInr),
      currency: cur,
      costMinMinor: convertFromInr(toMinor(e.costMinInr), cur, rate),
      costMaxMinor: convertFromInr(toMinor(e.costMaxInr), cur, rate),
      fxRate: rate,
      fxAsOf: asOf || new Date().toISOString().slice(0, 10),
      inclusions: e.inclusions,
      exclusions: e.exclusions,
      documentsNeeded: e.documentsNeeded,
      depositMinor: convertFromInr(toMinor(e.depositInr), cur, rate),
      validUntil: valid,
      status: "sent",
      sentAt: new Date(),
      createdByUserId: user.id,
    })
    .returning();
  await addEvent(db, c, user, "Treatment plan and cost estimate sent. You can book a video call with the doctor before you decide.", "plan_sent");
  await audit({ actor: { id: user.id, role: user.role }, action: "case.estimate_sent", entityType: "international_case", entityId: id, patientId: c.patientId });
  return est!;
}

export async function respondToEstimate(user: SessionUser, estimateId: string, accept: boolean) {
  const db = await getDb();
  const [est] = await db.select().from(caseEstimates).where(eq(caseEstimates.id, estimateId));
  if (!est || est.status !== "sent") throw new CaseError("This estimate can no longer be changed.");
  const [c] = await db.select().from(internationalCases).where(eq(internationalCases.id, est.caseId));
  if (!c || (await caseAccess(user, c)) !== "patient") throw new CaseError("Not allowed.");
  if (est.validUntil < new Date().toISOString().slice(0, 10)) throw new CaseError("This estimate has expired. Ask your coordinator for an updated one.");
  await db.update(caseEstimates).set({ status: accept ? "accepted" : "declined", respondedAt: new Date() }).where(eq(caseEstimates.id, estimateId));
  if (accept) {
    await db.update(internationalCases).set({ depositMinor: est.depositMinor }).where(eq(internationalCases.id, c.id));
    await addEvent(db, c, user, "You accepted the treatment plan. Next: the hospital issues your medical visa invitation letter.", "accepted");
  } else {
    await addEvent(db, c, user, "You declined the estimate. Your coordinator will contact you about other options.", null);
  }
  for (const r of await staffRecipients(db, c))
    await notifyUser(db, r.userId, { template: "case_estimate_response", title: `${c.ref}: estimate ${accept ? "accepted" : "declined"}`, body: est.recommendedTreatment, link: r.link });
  await audit({ actor: { id: user.id, role: user.role }, action: accept ? "case.estimate_accepted" : "case.estimate_declined", entityType: "international_case", entityId: c.id, patientId: c.patientId });
}

const VISA_ATTENDANTS_MAX = 2;

/** Hospital invitation letter for an e-Medical visa (patient) and e-Medical Attendant visas (up to 2). */
export async function issueVisaLetter(
  user: SessionUser,
  id: string,
  v: { passportNumber: string; nationality: string; attendants: { name: string; relationship: string; passportNumber: string; nationality: string }[]; expectedAdmission: string | null; expectedDays: number | null; treatment: string },
) {
  const { db, c } = await staffCase(user, id);
  if (!["accepted", "visa_letter_issued", "travel_booked"].includes(c.status)) throw new CaseError("The patient must accept the plan before a visa letter is issued.");
  if (v.attendants.length > VISA_ATTENDANTS_MAX) throw new CaseError("India allows up to 2 medical attendants.");
  const clinicId = c.assignedClinicId ?? c.preferredClinicId;
  const [clinic] = clinicId ? await db.select().from(clinics).where(eq(clinics.id, clinicId)) : [];
  if (!clinic) throw new CaseError("Assign a hospital first.");
  const [p] = await db.select().from(patients).where(eq(patients.id, c.patientId));
  const number = refs.visaLetter();
  const mask = (s: string) => (s.length > 4 ? `${"•".repeat(s.length - 4)}${s.slice(-4)}` : s);
  const today = new Date().toISOString().slice(0, 10);
  const pdf = await simplePdf({
    title: `${clinic.name}`,
    subtitle: `${clinic.addressLine}, ${clinic.city}, ${clinic.state} · ${clinic.phone ?? ""} · Letter ${number} · ${today}`,
    sections: [
      { heading: "To: The Visa Officer, Embassy / High Commission of India", lines: ["Subject: Invitation for medical treatment (e-Medical visa)"] },
      {
        heading: "Patient",
        lines: [`Name: ${p!.fullName}`, `Nationality: ${v.nationality}`, `Passport number: ${v.passportNumber}`, `Date of birth: ${p!.dob ?? "—"}`],
      },
      {
        heading: "Treatment",
        lines: [
          `We confirm that the above patient has been evaluated by our specialist and is advised: ${v.treatment}.`,
          v.expectedAdmission ? `Expected admission date: ${v.expectedAdmission}.` : "Admission date to be confirmed on arrival.",
          v.expectedDays ? `Expected stay in India: about ${v.expectedDays} days, including recovery and follow-up.` : "",
          "We request you to kindly grant an e-Medical visa to the patient.",
        ].filter(Boolean),
      },
      ...(v.attendants.length
        ? [{ heading: "Medical attendants (e-Medical Attendant visa)", lines: v.attendants.map((a, i) => `${i + 1}. ${a.name} (${a.relationship}), ${a.nationality}, passport ${a.passportNumber}`) }]
        : []),
      { heading: "Contact", lines: [`International patient desk: ${clinic.internationalDesk?.phone ?? clinic.phone ?? ""} ${clinic.internationalDesk?.email ?? clinic.email ?? ""}`, `Case reference: ${c.ref}. Verify this letter with the hospital using the letter number.`] },
    ],
    footer: `${brand.name} on behalf of ${clinic.name}. Signed by the international patient desk. ${number}`,
  });
  const saved = await saveFile(Buffer.from(pdf));
  const [doc] = await db
    .insert(documents)
    .values({ patientId: c.patientId, caseId: c.id, clinicId: clinic.id, uploadedByUserId: user.id, category: "visa_letter", title: `Medical visa invitation letter ${number}`, fileName: `visa-letter-${number}.pdf`, mimeType: "application/pdf", sizeBytes: saved.sizeBytes, storageKey: saved.storageKey, sha256: saved.sha256, source: "generated" })
    .returning();
  await db.insert(visaLetters).values({
    caseId: c.id,
    clinicId: clinic.id,
    letterNumber: number,
    patientName: p!.fullName,
    passportNumberEnc: encryptText(v.passportNumber),
    nationality: v.nationality,
    attendants: v.attendants.map((a) => ({ name: a.name, relationship: a.relationship, nationality: a.nationality, passportNumberEnc: encryptText(a.passportNumber) })),
    treatment: v.treatment,
    expectedAdmission: v.expectedAdmission,
    expectedDays: v.expectedDays,
    documentId: doc!.id,
    issuedByUserId: user.id,
  });
  await addEvent(db, c, user, `Visa invitation letter ${number} issued (passport ${mask(v.passportNumber)}). Download it from your case and apply for the e-Medical visa online.`, c.status === "accepted" ? "visa_letter_issued" : null);
  await audit({ actor: { id: user.id, role: user.role }, action: "case.visa_letter", entityType: "international_case", entityId: c.id, patientId: c.patientId, metadata: { number, attendants: v.attendants.length } });
  return { number, documentId: doc!.id };
}

const STAFF_STATUSES: CaseStatus[] = ["under_review", "travel_booked", "arrived", "in_treatment", "discharged", "follow_up", "closed"];

export async function updateCaseStatus(user: SessionUser, id: string, status: CaseStatus, note: string, visibleToPatient = true) {
  if (!STAFF_STATUSES.includes(status)) throw new CaseError("That step happens automatically.");
  const { db, c } = await staffCase(user, id);
  await addEvent(db, c, user, note || CASE_STEPS.find((s) => s.status === status)!.label, status, visibleToPatient);
  await audit({ actor: { id: user.id, role: user.role }, action: "case.status", entityType: "international_case", entityId: c.id, patientId: c.patientId, metadata: { status } });
}

export async function addCaseNote(user: SessionUser, id: string, note: string, visibleToPatient: boolean) {
  const { db, c } = await staffCase(user, id);
  await addEvent(db, c, user, note, null, visibleToPatient);
}

export async function updateTravel(user: SessionUser, id: string, travel: Partial<CaseRow["travel"]>) {
  const db = await getDb();
  const [c] = await db.select().from(internationalCases).where(eq(internationalCases.id, id));
  if (!c) throw new CaseError("Case not found.");
  const access = await caseAccess(user, c);
  if (!access || access === "doctor") throw new CaseError("Not allowed.");
  const next = { ...c.travel, ...travel };
  await db.update(internationalCases).set({ travel: next, updatedAt: new Date() }).where(eq(internationalCases.id, id));
  if (access === "patient" && c.coordinatorUserId) await notifyUser(db, c.coordinatorUserId, { template: "case_travel", title: `${c.ref}: travel details updated`, body: "The patient updated arrival or stay details.", link: `/coordinator/cases/${c.id}` });
}

export async function postCaseMessage(user: SessionUser, id: string, body: string) {
  const db = await getDb();
  const [c] = await db.select().from(internationalCases).where(eq(internationalCases.id, id));
  if (!c) throw new CaseError("Case not found.");
  const access = await caseAccess(user, c);
  if (!access) throw new CaseError("Not allowed.");
  const text = body.trim().slice(0, 4000);
  if (!text) throw new CaseError("Write a message first.");
  const role = access === "patient" ? (user.role === "caregiver" ? "caregiver" : "patient") : access === "doctor" ? "doctor" : "coordinator";
  const name = access === "clinic" || access === "coordinator" ? `${user.name} (${access === "clinic" ? "Hospital desk" : "Care coordinator"})` : user.name;
  await db.insert(messages).values({ caseId: c.id, patientId: c.patientId, senderUserId: user.id, senderRole: role, senderName: name, body: text });
  await db.update(internationalCases).set({ updatedAt: new Date() }).where(eq(internationalCases.id, id));
  if (access === "patient") {
    for (const r of await staffRecipients(db, c))
      await notifyUser(db, r.userId, { template: "case_message", title: `${c.ref}: new message`, body: text.slice(0, 140), link: r.link });
  } else {
    await notifyUser(db, c.createdByUserId, { template: "case_message", title: `New message about your case ${c.ref}`, body: text.slice(0, 140), link: `/international/cases/${c.id}` });
  }
}
