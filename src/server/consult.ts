import "server-only";
import { UserError } from "@/lib/errors";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, withRls } from "@/db";
import {
  appointments,
  clinics,
  consents,
  consultActions,
  consultNotes,
  doctorLicences,
  doctorQualifications,
  doctors,
  medicines,
  patients,
  payments,
  prescriptionItems,
  prescriptions,
  specialties,
} from "@/db/schema";
import { brand } from "@/config/brand";
import { refs } from "@/lib/ids";
import { signRx, type RxSnapshot } from "@/lib/rx";
import { checkPrescription, FREQUENCIES, type TpgList } from "@/lib/tpg";
import { addDays, dayInZone } from "@/lib/time";
import { ageFrom } from "@/lib/utils";
import type { SessionUser } from "./auth/session";
import { notifyAppointment } from "./notify";
import { audit } from "./audit";
import { postRoomMessage, type RoomAccess } from "./room";

export class ConsultError extends UserError {}

export async function doctorForUser(user: SessionUser) {
  const db = await getDb();
  const [d] = await db.select().from(doctors).where(eq(doctors.userId, user.id));
  return d ?? null;
}

async function ownAppointment(user: SessionUser, apptId: string) {
  const d = await doctorForUser(user);
  if (!d) throw new ConsultError("Doctor profile not found");
  const db = await getDb();
  const [a] = await db.select().from(appointments).where(and(eq(appointments.id, apptId), eq(appointments.doctorId, d.id)));
  if (!a) throw new ConsultError("Consult not found");
  return { doctor: d, appt: a, db };
}

export type NotesInput = {
  complaint: string;
  history: string;
  findings: string;
  diagnosis: string;
  provisional: boolean;
  advice: string;
  investigations: string[];
  warningSigns: string;
  patientSummary: string;
  privateNotes: string;
  followUpDate: string | null;
};

export async function saveNotes(user: SessionUser, apptId: string, n: NotesInput, finalise = false) {
  const { doctor, appt } = await ownAppointment(user, apptId);
  await withRls({ userId: user.id, role: user.role }, async (tx) => {
    const values = { ...n, finalisedAt: finalise ? new Date() : null };
    const [existing] = await tx.select({ id: consultNotes.id }).from(consultNotes).where(eq(consultNotes.appointmentId, appt.id));
    if (existing) await tx.update(consultNotes).set(values).where(eq(consultNotes.id, existing.id));
    else await tx.insert(consultNotes).values({ appointmentId: appt.id, patientId: appt.patientId, doctorId: doctor.id, ...values });
  });
}

/** TPG: confirm the patient's name, age and sex at each consult; a guardian must be present for a minor. */
export async function confirmIdentity(user: SessionUser, apptId: string, opts: { guardianName?: string; guardianRelationship?: string; explicitConsent?: boolean }) {
  const { appt, db } = await ownAppointment(user, apptId);
  const [p] = await db.select().from(patients).where(eq(patients.id, appt.patientId));
  const minor = (ageFrom(p?.dob) ?? 99) < 18;
  if (minor && !opts.guardianName && !appt.guardianPresent) throw new ConsultError("A parent or guardian must be present for a minor.");
  await db
    .update(appointments)
    .set({
      identityConfirmedAt: new Date(),
      guardianPresent: minor ? (opts.guardianName ? { name: opts.guardianName, relationship: opts.guardianRelationship ?? "Guardian" } : appt.guardianPresent) : null,
      explicitConsentAt: opts.explicitConsent ? new Date() : appt.explicitConsentAt,
    })
    .where(eq(appointments.id, appt.id));
  if (opts.explicitConsent) {
    await db.insert(consents).values({ patientId: appt.patientId, appointmentId: appt.id, type: "telemedicine", version: "1.0", granted: true, method: "explicit_verbal", recordedByUserId: user.id });
  }
  await audit({ actor: { id: user.id, role: user.role }, action: "consult.identity_confirmed", entityType: "appointment", entityId: appt.id, patientId: appt.patientId, metadata: { minor, explicitConsent: Boolean(opts.explicitConsent) } }, db);
}

export type RxItemInput = {
  medicineId: string | null;
  name: string;
  form: string;
  strength: string;
  dose: string;
  frequency: string;
  timing: string;
  durationDays: number;
  instructions: string;
  tpgList?: TpgList;
};

/** Check items against TPG lists, allergies and duplicates. Returns the checked items (server is authoritative). */
export async function checkRx(apptId: string, items: RxItemInput[]) {
  const db = await getDb();
  const [a] = await db.select().from(appointments).where(eq(appointments.id, apptId));
  const [p] = a ? await db.select().from(patients).where(eq(patients.id, a.patientId)) : [];
  if (!a || !p) throw new ConsultError("Consult not found");
  const ids = items.map((i) => i.medicineId).filter(Boolean) as string[];
  const meds = ids.length ? await db.select().from(medicines).where(inArray(medicines.id, ids)) : [];
  const resolved = items.map((i) => {
    const m = meds.find((x) => x.id === i.medicineId);
    // Free-text medicines are checked against the prohibited list by name.
    let list: TpgList = m?.tpgList ?? i.tpgList ?? "O";
    if (!m && /alprazolam|clonazepam|diazepam|lorazepam|nitrazepam|zolpidem|tramadol|codeine|morphine|buprenorphine|pentazocine|methylphenidate|phenobarbit|ketamine|fentanyl|pethidine|oxycodone/i.test(i.name)) list = "prohibited";
    return { ...i, tpgList: list, genericName: m?.genericName ?? i.name, drugClass: m?.drugClass, medicineName: m?.genericName ?? i.name };
  });
  const allergies = [...p.allergies, ...(a.preConsult?.allergies ? a.preConsult.allergies.split(/[,;\n]/) : [])].map((s) => s.trim()).filter((s) => s && !/^none$/i.test(s));
  const currentMedicines = [...p.currentMedicines, ...(a.preConsult?.currentMedicines ? a.preConsult.currentMedicines.split(/[,;\n]/) : [])].map((s) => s.trim()).filter(Boolean);
  const checks = checkPrescription(resolved, { mode: a.mode, consultType: a.consultType, allergies, currentMedicines });
  return { appt: a, patient: p, resolved, checks };
}

export async function issuePrescription(
  user: SessionUser,
  apptId: string,
  rx: { diagnosis: string; provisional: boolean; advice: string; investigations: string[]; followUpDate: string | null; items: RxItemInput[]; acknowledgedWarnings: boolean },
) {
  const { doctor, appt, db } = await ownAppointment(user, apptId);
  if (!appt.identityConfirmedAt) throw new ConsultError("Please confirm the patient's name, age and sex first.");
  if (!rx.diagnosis.trim()) throw new ConsultError("Add a diagnosis or provisional diagnosis.");
  if (!rx.items.length && !rx.advice.trim()) throw new ConsultError("Add at least one medicine or some advice.");
  const { patient, resolved, checks } = await checkRx(apptId, rx.items);
  const blocked = checks.filter((c) => c.blocked);
  if (blocked.length) throw new ConsultError(blocked.map((b) => `${resolved[b.index]!.name}: ${b.blocked}`).join(" "));
  if (checks.some((c) => c.warnings.length) && !rx.acknowledgedWarnings) throw new ConsultError("Please review the warnings and confirm.");

  const [quals, lics, spec] = await Promise.all([
    db.select().from(doctorQualifications).where(eq(doctorQualifications.doctorId, doctor.id)),
    // Every consult is given under India's telemedicine rules, so the
    // prescription carries the doctor's Indian registration.
    db.select().from(doctorLicences).where(and(eq(doctorLicences.doctorId, doctor.id), eq(doctorLicences.status, "verified"), eq(doctorLicences.country, "IN"))),
    db.select().from(specialties).where(eq(specialties.id, doctor.specialtyId)),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const regLicences = lics.filter((l) => !l.expiresAt || l.expiresAt >= today);
  if (!regLicences.length) throw new ConsultError("Your Indian registration is missing or has expired. Please update it before issuing a prescription.");
  // Clinical psychologists (registered with the Rehabilitation Council of India) never prescribe medicine.
  const medicalRegistration = regLicences.some((l) => l.issuingBody !== "Rehabilitation Council of India");
  if (rx.items.length && !medicalRegistration) throw new ConsultError("Clinical psychologists cannot prescribe medicines. Write your advice instead, or refer the patient to a psychiatrist.");
  const [clinic] = doctor.primaryClinicId ? await db.select().from(clinics).where(eq(clinics.id, doctor.primaryClinicId)) : [];
  const number = refs.prescription();
  const issuedAt = new Date();
  const snapshot: RxSnapshot = {
    number,
    issuedAt: issuedAt.toISOString(),
    brand: brand.name,
    doctor: {
      name: doctor.fullName,
      qualifications: quals.map((q) => q.degree).join(", "),
      specialty: spec[0]?.name ?? "",
      registrations: regLicences.map((l) => ({ number: l.number, issuingBody: l.issuingBody, country: l.country, region: l.region })),
      clinic: clinic ? { name: clinic.name, address: `${clinic.addressLine}, ${clinic.city}, ${clinic.state} ${clinic.postcode}`, phone: clinic.phone } : null,
      contact: brand.supportPhone,
      signatureDocumentId: doctor.signatureDocumentId,
    },
    // Consult jurisdiction, always India.
    patient: { name: patient.fullName, age: ageFrom(patient.dob), sex: patient.sex, location: "IN" },
    consult: { ref: appt.ref, mode: appt.mode, type: appt.consultType, date: appt.startAt.toISOString() },
    diagnosis: rx.diagnosis,
    provisional: rx.provisional,
    items: resolved.map((r) => ({
      name: r.medicineName,
      strength: r.strength,
      form: r.form,
      dose: r.dose,
      frequency: r.frequency,
      frequencyLabel: FREQUENCIES[r.frequency]?.label ?? r.frequency,
      timing: r.timing,
      durationDays: r.durationDays,
      instructions: r.instructions,
      tpgList: r.tpgList,
    })),
    advice: rx.advice,
    investigations: rx.investigations,
    followUpDate: rx.followUpDate,
  };
  const { signature, hash } = signRx(snapshot);
  const rxRow = await withRls({ userId: user.id, role: user.role }, async (tx) => {
    const [row] = await tx
      .insert(prescriptions)
      .values({
        number,
        appointmentId: appt.id,
        patientId: appt.patientId,
        doctorId: doctor.id,
        consultMode: appt.mode,
        consultType: appt.consultType,
        diagnosis: rx.diagnosis,
        provisional: rx.provisional,
        advice: rx.advice,
        investigations: rx.investigations,
        followUpDate: rx.followUpDate,
        snapshot,
        signature,
        payloadHash: hash,
        issuedAt,
      })
      .returning();
    if (resolved.length)
      await tx.insert(prescriptionItems).values(
        resolved.map((r, i) => ({
          prescriptionId: row!.id,
          patientId: appt.patientId,
          medicineId: r.medicineId,
          name: r.medicineName,
          form: r.form,
          strength: r.strength,
          dose: r.dose,
          frequency: r.frequency,
          timing: r.timing,
          durationDays: r.durationDays,
          instructions: r.instructions,
          tpgList: r.tpgList,
          sortOrder: i,
        })),
      );
    return row!;
  });
  await audit({ actor: { id: user.id, role: user.role }, action: "prescription.issue", entityType: "prescription", entityId: rxRow.id, patientId: appt.patientId, metadata: { items: resolved.length } }, db);
  await notifyAppointment(db, appt.id, ({ t }) => ({
    template: "prescription_issued",
    title: t("Your digital prescription is ready"),
    body: t("{doctor} sent you a prescription. You can open it in your account.", { doctor: doctor.fullName }),
    link: `/prescriptions/${rxRow.id}`,
  }));
  return rxRow;
}

export type ActionType = "in_person_visit" | "specialist_referral" | "tests" | "emergency" | "follow_up";

export async function addConsultAction(user: SessionUser, apptId: string, type: ActionType, details: { reason?: string; urgency?: string; tests?: string[]; specialtySlug?: string; clinicId?: string | null; dueInDays?: number; followUpMode?: string }) {
  const { doctor, appt, db } = await ownAppointment(user, apptId);
  let targetSpecialtyId: string | null = null;
  if (details.specialtySlug) {
    const [s] = await db.select().from(specialties).where(eq(specialties.slug, details.specialtySlug));
    targetSpecialtyId = s?.id ?? null;
  }
  const dueBy = details.dueInDays ? addDays(dayInZone(new Date(), appt.patientTimeZone), details.dueInDays) : null;
  const [action] = await db
    .insert(consultActions)
    .values({
      appointmentId: appt.id,
      patientId: appt.patientId,
      doctorId: doctor.id,
      type,
      details,
      targetDoctorId: type === "in_person_visit" || type === "follow_up" ? doctor.id : null,
      targetClinicId: type === "in_person_visit" ? (details.clinicId ?? doctor.primaryClinicId) : null,
      targetSpecialtyId,
      dueBy,
    })
    .returning();
  if (type === "in_person_visit" || type === "emergency") {
    await db.update(appointments).set({ outcome: type === "emergency" ? "emergency" : "needs_in_person" }).where(eq(appointments.id, appt.id));
  }
  await audit({ actor: { id: user.id, role: user.role }, action: `consult.action.${type}`, entityType: "appointment", entityId: appt.id, patientId: appt.patientId, metadata: details }, db);
  const titles: Record<ActionType, [string, string]> = {
    in_person_visit: ["Clinic visit recommended", "Your doctor recommends a visit in person. Book a clinic slot in one tap."],
    specialist_referral: ["Referral to a specialist", "Your doctor recommends seeing a specialist."],
    tests: ["Tests ordered", "Your doctor ordered tests. You can book them with a partner lab."],
    emergency: ["Please go to hospital now", "Your doctor advised emergency care. Call the emergency number or go to the nearest hospital."],
    follow_up: ["Follow up recommended", "Your doctor would like to see you again."],
  };
  await notifyAppointment(db, appt.id, ({ t }) => ({
    template: `action_${type}`,
    title: t(titles[type][0]),
    body: t(titles[type][1]),
    link: type === "in_person_visit" ? `/consults/${appt.id}/clinic-visit` : `/consults/${appt.id}#next-steps`,
  }));
  return action!;
}

/** End the consult: completes it, opens the free follow-up chat window, and releases the doctor's payout. */
export async function endConsult(user: SessionUser, apptId: string, outcome: "completed" | "needs_in_person" | "referred" | "emergency" | "ended_early") {
  const { doctor, appt, db } = await ownAppointment(user, apptId);
  if (appt.status === "completed") return appt;
  const now = new Date();
  const [updated] = await db
    .update(appointments)
    .set({
      status: "completed",
      endedAt: now,
      endedBy: "doctor",
      outcome: appt.outcome && appt.outcome !== "completed" ? appt.outcome : outcome,
      followUpChatUntil: new Date(now.getTime() + doctor.followUpChatDays * 86400_000),
    })
    .where(eq(appointments.id, appt.id))
    .returning();
  await db.update(payments).set({ payoutState: "released" }).where(and(eq(payments.appointmentId, appt.id), eq(payments.status, "captured")));
  await db.update(doctors).set({ consultCount: sql`${doctors.consultCount} + 1` }).where(eq(doctors.id, doctor.id));
  await withRls({ userId: user.id, role: user.role }, (tx) => tx.update(consultNotes).set({ finalisedAt: now }).where(and(eq(consultNotes.appointmentId, appt.id), sql`${consultNotes.finalisedAt} is null`)));
  await audit({ actor: { id: user.id, role: user.role }, action: "consult.end", entityType: "appointment", entityId: appt.id, patientId: appt.patientId, metadata: { outcome } }, db);
  await notifyAppointment(db, appt.id, ({ t }) => ({
    template: "consult_summary",
    title: t("Your consult summary is ready"),
    body: t("Read {doctor}'s advice in simple words, and message them for {days} days.", { doctor: doctor.fullName, days: doctor.followUpChatDays }),
    link: `/consults/${appt.id}`,
  }));
  return updated!;
}

export async function setRunningLate(user: SessionUser, minutes: number) {
  const d = await doctorForUser(user);
  if (!d) return;
  const db = await getDb();
  await db
    .update(appointments)
    .set({ doctorRunningLateMinutes: Math.max(0, Math.min(60, minutes)) })
    .where(and(eq(appointments.doctorId, d.id), eq(appointments.status, "confirmed"), sql`${appointments.startAt} < now() + interval '4 hours'`, sql`${appointments.startAt} > now() - interval '2 hours'`));
}

export async function systemMessage(access: RoomAccess, text: string) {
  return postRoomMessage(access, text, null, "system");
}
