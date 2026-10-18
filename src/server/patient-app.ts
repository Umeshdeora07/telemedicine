import "server-only";
import { UserError } from "@/lib/errors";
import { and, asc, desc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { getDb, withRls } from "@/db";
import {
  appointments,
  consents,
  dataRequests,
  documents,
  doctors,
  familyLinks,
  messages,
  patients,
  payments,
  prescriptionItems,
  prescriptions,
  readings,
  recordAccessGrants,
  savedDoctors,
  sessions,
  shareLinks,
  users,
} from "@/db/schema";
import type { SessionUser } from "@/server/auth/session";
import { canActForPatient } from "@/server/booking";
import { myPatientIds } from "@/server/patient";
import { audit } from "@/server/audit";
import { notifyUser } from "@/server/notify";
import { randomToken, sha256 } from "@/lib/crypto";
import { env } from "@/config/env";

export class PatientError extends UserError {}

const who = (u: SessionUser) => ({ id: u.id, role: u.role });

async function must(user: SessionUser, patientId: string, need: "book" | "join" | "records") {
  const db = await getDb();
  const a = await canActForPatient(db, user.id, patientId, need);
  if (!a.ok) throw new PatientError("You don't have permission for this person's records.");
  return db;
}

/* --------------------------------------------------------------- records */

export async function recordsFor(user: SessionUser, patientId: string) {
  await must(user, patientId, "records");
  const db = await getDb();
  const data = await withRls({ userId: user.id, role: user.role }, async (tx) => {
    const docs = await tx.select().from(documents).where(and(eq(documents.patientId, patientId), isNull(documents.deletedAt))).orderBy(sql`coalesce(${documents.reportDate}::timestamptz, ${documents.createdAt}) desc`);
    const rx = await tx
      .select({ rx: prescriptions, doctorName: doctors.fullName })
      .from(prescriptions)
      .innerJoin(doctors, eq(doctors.id, prescriptions.doctorId))
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.issuedAt));
    return { docs, rx };
  });
  const grants = await db
    .select({ g: recordAccessGrants, doctorName: doctors.fullName })
    .from(recordAccessGrants)
    .innerJoin(doctors, eq(doctors.id, recordAccessGrants.doctorId))
    .where(and(eq(recordAccessGrants.patientId, patientId), isNull(recordAccessGrants.revokedAt), gt(recordAccessGrants.expiresAt, new Date())));
  const links = await db.select().from(shareLinks).where(and(eq(shareLinks.patientId, patientId), isNull(shareLinks.revokedAt), gt(shareLinks.expiresAt, new Date()))).orderBy(desc(shareLinks.createdAt));
  await audit({ actor: who(user), action: "record.view", entityType: "patient", entityId: patientId, patientId, metadata: { context: "vault" } });
  return { ...data, grants, links };
}

export async function revokeGrant(user: SessionUser, grantId: string) {
  const db = await getDb();
  const [g] = await db.select().from(recordAccessGrants).where(eq(recordAccessGrants.id, grantId));
  if (!g) throw new PatientError("Not found.");
  await must(user, g.patientId, "records");
  await db.update(recordAccessGrants).set({ revokedAt: new Date() }).where(eq(recordAccessGrants.id, grantId));
  await audit({ actor: who(user), action: "grant.revoke", entityType: "record_access_grant", entityId: grantId, patientId: g.patientId });
}

/** A time-limited link a patient can send to any doctor or hospital (no login needed). */
export async function createShareLink(user: SessionUser, patientId: string, documentIds: string[], days: number, note: string) {
  const db = await must(user, patientId, "records");
  const own = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.patientId, patientId), inArray(documents.id, documentIds.length ? documentIds : ["00000000-0000-0000-0000-000000000000"]), isNull(documents.deletedAt)));
  if (!own.length) throw new PatientError("Choose at least one document to share.");
  const token = randomToken(18);
  const [row] = await db
    .insert(shareLinks)
    .values({ patientId, createdByUserId: user.id, tokenHash: sha256(token), documentIds: own.map((d) => d.id), recipientNote: note.slice(0, 200) || null, expiresAt: new Date(Date.now() + Math.min(30, Math.max(1, days)) * 86400_000) })
    .returning();
  await db.insert(consents).values({ userId: user.id, patientId, type: "records_sharing", version: "1.0", granted: true, method: "checkbox" });
  await audit({ actor: who(user), action: "share_link.create", entityType: "share_link", entityId: row!.id, patientId, metadata: { documents: own.length, days } });
  return { url: `${env.appUrl}/share/${token}`, id: row!.id };
}

export async function revokeShareLink(user: SessionUser, id: string) {
  const db = await getDb();
  const [l] = await db.select().from(shareLinks).where(eq(shareLinks.id, id));
  if (!l) throw new PatientError("Not found.");
  await must(user, l.patientId, "records");
  await db.update(shareLinks).set({ revokedAt: new Date() }).where(eq(shareLinks.id, id));
  await audit({ actor: who(user), action: "share_link.revoke", entityType: "share_link", entityId: id, patientId: l.patientId });
}

export async function openShareLink(token: string, opts: { count: boolean }) {
  const db = await getDb();
  const [l] = await db.select().from(shareLinks).where(and(eq(shareLinks.tokenHash, sha256(token)), isNull(shareLinks.revokedAt), gt(shareLinks.expiresAt, new Date())));
  if (!l) return null;
  const [p] = await db.select({ fullName: patients.fullName, dob: patients.dob, sex: patients.sex, allergies: patients.allergies, conditions: patients.conditions, bloodGroup: patients.bloodGroup }).from(patients).where(eq(patients.id, l.patientId));
  const docs = await db.select().from(documents).where(and(inArray(documents.id, l.documentIds), isNull(documents.deletedAt)));
  if (opts.count) {
    await db.update(shareLinks).set({ accessCount: l.accessCount + 1, lastAccessAt: new Date() }).where(eq(shareLinks.id, l.id));
    await audit({ actor: null, action: "share_link.open", entityType: "share_link", entityId: l.id, patientId: l.patientId });
  }
  return { link: l, patient: p!, docs };
}

/** Demo ABHA (Ayushman Bharat Health Account) linking. Real linking needs ABDM sandbox approval. */
export async function linkAbha(user: SessionUser, patientId: string, address: string) {
  const db = await must(user, patientId, "book");
  const clean = address.trim().toLowerCase();
  if (!/^[a-z0-9._]{4,32}@(abdm|sbx)$/.test(clean)) throw new PatientError("Enter your ABHA address, like name.surname@abdm");
  await db.update(patients).set({ abhaAddress: clean, abhaLinkedAt: new Date() }).where(eq(patients.id, patientId));
  await db.insert(consents).values({ userId: user.id, patientId, type: "abha", version: "1.0", granted: true, method: "checkbox" });
  await audit({ actor: who(user), action: "abha.link", entityType: "patient", entityId: patientId, patientId });
}

/* --------------------------------------------------------------- family */

export async function familyOverview(user: SessionUser) {
  const db = await getDb();
  const mine = await db
    .select({ l: familyLinks, p: patients })
    .from(familyLinks)
    .innerJoin(patients, eq(patients.id, familyLinks.patientId))
    .where(and(eq(familyLinks.caregiverUserId, user.id), ne(familyLinks.status, "revoked"), isNull(patients.deletedAt)))
    .orderBy(asc(patients.fullName));
  // People who can act for *me* (my own patient profile).
  const [self] = await db.select().from(patients).where(and(eq(patients.userId, user.id), isNull(patients.deletedAt)));
  const caregivers = self
    ? await db.select({ l: familyLinks, name: users.name, phone: users.phone }).from(familyLinks).innerJoin(users, eq(users.id, familyLinks.caregiverUserId)).where(and(eq(familyLinks.patientId, self.id), ne(familyLinks.status, "revoked")))
    : [];
  return { mine, self: self ?? null, caregivers };
}

export async function addFamilyMember(
  user: SessionUser,
  m: { fullName: string; dob: string; sex: "female" | "male" | "other"; relationship: string; phone: string | null; country: string; guardianDeclaration: boolean },
) {
  const db = await getDb();
  const age = Math.floor((Date.now() - new Date(m.dob).getTime()) / (365.25 * 86400_000));
  const minor = age < 18;
  if (minor && !m.guardianDeclaration) throw new PatientError("Confirm you are the parent or legal guardian.");
  if (!minor && !m.phone) throw new PatientError("For adults we need their mobile number to ask for their consent.");
  const [p] = await db.insert(patients).values({ ownerUserId: user.id, fullName: m.fullName, dob: m.dob, sex: m.sex, phone: m.phone, country: m.country }).returning();
  const [link] = await db
    .insert(familyLinks)
    .values({ caregiverUserId: user.id, patientId: p!.id, relationship: m.relationship, status: minor ? "active" : "pending_consent", consentMethod: minor ? "guardian_declaration" : null, consentAt: minor ? new Date() : null })
    .returning();
  if (minor) await db.insert(consents).values({ userId: user.id, patientId: p!.id, type: "caregiver_booking", version: "1.0", granted: true, method: "guardian_declaration" });
  await audit({ actor: who(user), action: "family.add", entityType: "patient", entityId: p!.id, patientId: p!.id, metadata: { minor, relationship: m.relationship } });
  return { patient: p!, link: link!, needsConsent: !minor };
}

/** Text the family member a code; when they read it back, their consent is recorded. */
export async function sendFamilyConsentCode(user: SessionUser, linkId: string) {
  const db = await getDb();
  const [row] = await db.select({ l: familyLinks, p: patients }).from(familyLinks).innerJoin(patients, eq(patients.id, familyLinks.patientId)).where(and(eq(familyLinks.id, linkId), eq(familyLinks.caregiverUserId, user.id)));
  if (!row?.p.phone) throw new PatientError("Add their mobile number first.");
  const { requestOtp } = await import("@/server/auth/otp");
  // The SMS tells the family member who is asking, so they only share the code if they agree.
  return requestOtp({ kind: "phone", value: row.p.phone }, "family_consent", { caregiverName: user.name, linkId });
}

export async function confirmFamilyConsent(user: SessionUser, linkId: string, code: string) {
  const db = await getDb();
  const [row] = await db.select({ l: familyLinks, p: patients }).from(familyLinks).innerJoin(patients, eq(patients.id, familyLinks.patientId)).where(and(eq(familyLinks.id, linkId), eq(familyLinks.caregiverUserId, user.id)));
  if (!row?.p.phone) throw new PatientError("Not found.");
  const { verifyOtp } = await import("@/server/auth/otp");
  const ok = await verifyOtp({ kind: "phone", value: row.p.phone }, code, "family_consent");
  if (!ok.ok) throw new PatientError(ok.error, "params" in ok ? ok.params : undefined);
  if ((ok.meta as { linkId?: string } | null)?.linkId !== linkId) throw new PatientError("That code was sent for a different request. Send a new code.");
  await db.update(familyLinks).set({ status: "active", consentMethod: "otp", consentAt: new Date() }).where(eq(familyLinks.id, linkId));
  await db.insert(consents).values({ userId: user.id, patientId: row.p.id, type: "caregiver_booking", version: "1.0", granted: true, method: "otp" });
  await audit({ actor: who(user), action: "family.consent", entityType: "family_link", entityId: linkId, patientId: row.p.id });
}

export async function setLinkPermissions(user: SessionUser, linkId: string, perms: { canBook: boolean; canJoin: boolean; canViewRecords: boolean; receivesNotifications: boolean }) {
  const db = await getDb();
  const [l] = await db.select().from(familyLinks).where(eq(familyLinks.id, linkId));
  if (!l) throw new PatientError("Not found.");
  // The caregiver or the patient themself can change what the caregiver may do.
  const [self] = await db.select({ id: patients.id }).from(patients).where(and(eq(patients.id, l.patientId), eq(patients.userId, user.id)));
  if (l.caregiverUserId !== user.id && !self) throw new PatientError("Not allowed.");
  await db.update(familyLinks).set(perms).where(eq(familyLinks.id, linkId));
  await audit({ actor: who(user), action: "family.permissions", entityType: "family_link", entityId: linkId, patientId: l.patientId, metadata: perms });
}

export async function revokeLink(user: SessionUser, linkId: string) {
  const db = await getDb();
  const [l] = await db.select().from(familyLinks).where(eq(familyLinks.id, linkId));
  if (!l) throw new PatientError("Not found.");
  const [self] = await db.select({ id: patients.id }).from(patients).where(and(eq(patients.id, l.patientId), eq(patients.userId, user.id)));
  if (l.caregiverUserId !== user.id && !self) throw new PatientError("Not allowed.");
  await db.update(familyLinks).set({ status: "revoked", revokedAt: new Date() }).where(eq(familyLinks.id, linkId));
  await db.insert(consents).values({ userId: user.id, patientId: l.patientId, type: "caregiver_booking", version: "1.0", granted: false, method: "toggle" });
  if (self) await notifyUser(db, l.caregiverUserId, { template: "family_revoked", title: "Access removed", body: "A family member has removed your access to their consults and records." });
  await audit({ actor: who(user), action: "family.revoke", entityType: "family_link", entityId: linkId, patientId: l.patientId });
}

/* ------------------------------------------------------ profile & privacy */

export async function updateHealthProfile(user: SessionUser, patientId: string, f: { bloodGroup: string | null; heightCm: number | null; weightKg: number | null; allergies: string[]; conditions: string[]; currentMedicines: string[]; emergencyContact: { name: string; phone: string; relationship?: string } | null; preferredLanguage: string | null; city: string | null }) {
  const db = await must(user, patientId, "book");
  await db.update(patients).set({ ...f, updatedAt: new Date() }).where(eq(patients.id, patientId));
  await audit({ actor: who(user), action: "patient.update", entityType: "patient", entityId: patientId, patientId });
}

export const OPTIONAL_CONSENTS = ["whatsapp", "marketing", "research"] as const;

export async function consentState(userId: string) {
  const db = await getDb();
  const rows = await db.select().from(consents).where(eq(consents.userId, userId)).orderBy(desc(consents.createdAt));
  const latest = (type: string) => rows.find((r) => r.type === type) ?? null;
  return { rows, latest };
}

export async function setConsent(user: SessionUser, type: (typeof OPTIONAL_CONSENTS)[number], granted: boolean) {
  const db = await getDb();
  await db.insert(consents).values({ userId: user.id, type, version: "1.0", granted, method: "toggle" });
  if (type === "whatsapp") await db.update(users).set({ whatsappOptIn: granted }).where(eq(users.id, user.id));
  await audit({ actor: who(user), action: `consent.${granted ? "grant" : "withdraw"}`, entityType: "consent", entityId: type });
}

/** Everything we hold about the account holder and the people they manage, as JSON (DPDP right to access). */
export async function exportMyData(user: SessionUser) {
  const db = await getDb();
  const ids = await myPatientIds(user.id, "records");
  const owned = (await db.select({ id: patients.id }).from(patients).where(eq(patients.ownerUserId, user.id))).map((p) => p.id);
  const pids = [...new Set([...ids, ...owned])];
  const rls = { userId: user.id, role: user.role };
  const [u] = await db.select().from(users).where(eq(users.id, user.id));
  const data = await withRls(rls, async (tx) => ({
    patients: pids.length ? await tx.select().from(patients).where(inArray(patients.id, pids)) : [],
    prescriptions: pids.length ? await tx.select().from(prescriptions).where(inArray(prescriptions.patientId, pids)) : [],
    documents: pids.length ? (await tx.select().from(documents).where(inArray(documents.patientId, pids))).map(({ storageKey: _k, ...d }) => d) : [],
    readings: pids.length ? await tx.select().from(readings).where(inArray(readings.patientId, pids)) : [],
    messages: pids.length ? await tx.select().from(messages).where(inArray(messages.patientId, pids)) : [],
  }));
  const appts = pids.length ? await db.select().from(appointments).where(inArray(appointments.patientId, pids)) : [];
  const pays = await db.select().from(payments).where(eq(payments.userId, user.id));
  const cons = await db.select().from(consents).where(eq(consents.userId, user.id));
  const fam = await db.select().from(familyLinks).where(eq(familyLinks.caregiverUserId, user.id));
  const saved = await db.select().from(savedDoctors).where(eq(savedDoctors.userId, user.id));
  await audit({ actor: who(user), action: "data.export", entityType: "user", entityId: user.id });
  const { mfaSecretEnc: _m, ...account } = u!;
  return { exportedAt: new Date().toISOString(), account, ...data, appointments: appts, payments: pays, consents: cons, familyLinks: fam, savedDoctors: saved, note: "Document files can be downloaded one by one from your records. Ask support for a full archive." };
}

export async function requestDeletion(user: SessionUser, reason: string) {
  const db = await getDb();
  const upcoming = await db.select({ id: appointments.id }).from(appointments).where(and(eq(appointments.bookedByUserId, user.id), inArray(appointments.status, ["confirmed", "checked_in"]), gt(appointments.startAt, new Date())));
  if (upcoming.length) throw new PatientError("You have upcoming consults. Cancel them first (refunds follow the usual policy), then delete your account.");
  await db.insert(dataRequests).values({ userId: user.id, kind: "deletion", note: reason.slice(0, 500) || null, dueAt: new Date(Date.now() + 30 * 86400_000) });
  await db.update(users).set({ deletionRequestedAt: new Date(), status: "suspended" }).where(eq(users.id, user.id));
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  await audit({ actor: who(user), action: "account.delete_request", entityType: "user", entityId: user.id });
}

export async function prescriptionForUser(user: SessionUser, id: string) {
  const ids = await myPatientIds(user.id, "records");
  const row = await withRls({ userId: user.id, role: user.role }, async (tx) => {
    const [rx] = await tx.select({ rx: prescriptions, doctorName: doctors.fullName, patientName: patients.fullName }).from(prescriptions).innerJoin(doctors, eq(doctors.id, prescriptions.doctorId)).innerJoin(patients, eq(patients.id, prescriptions.patientId)).where(eq(prescriptions.id, id));
    if (!rx || !ids.includes(rx.rx.patientId)) return null;
    const items = await tx.select().from(prescriptionItems).where(eq(prescriptionItems.prescriptionId, id)).orderBy(asc(prescriptionItems.sortOrder));
    return { ...rx, items };
  });
  if (row) await audit({ actor: who(user), action: "record.view", entityType: "prescription", entityId: id, patientId: row.rx.patientId });
  return row;
}


