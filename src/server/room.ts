import "server-only";
import { cookies } from "next/headers";
import { and, asc, eq, gt, inArray, isNull, lt, lte, ne, sql } from "drizzle-orm";
import { getDb, type Executor } from "@/db";
import {
  appointmentInvites,
  appointments,
  doctors,
  familyLinks,
  messages,
  patients,
  roomParticipants,
  signals,
  users,
} from "@/db/schema";
import type { RecordingConsent } from "@/db/schema";
import { env } from "@/config/env";
import { randomToken, sha256 } from "@/lib/crypto";
import { getSession } from "./auth/session";
import { audit } from "./audit";

export type RoomRole = "patient" | "caregiver" | "doctor" | "interpreter" | "clinic";
export type RoomAccess = {
  role: RoomRole;
  displayName: string;
  userId: string | null;
  inviteId: string | null;
  appointment: typeof appointments.$inferSelect;
  doctor: typeof doctors.$inferSelect;
  patient: typeof patients.$inferSelect;
};

export const guestCookie = (apptId: string) => `room_guest_${apptId.replace(/-/g, "")}`;

/** Who is asking to enter this consult room, and as what. */
export async function getRoomAccess(apptId: string): Promise<RoomAccess | null> {
  const db = await getDb();
  const [row] = await db
    .select({ a: appointments, d: doctors, p: patients })
    .from(appointments)
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(eq(appointments.id, apptId));
  if (!row) return null;
  const base = { appointment: row.a, doctor: row.d, patient: row.p };
  const session = await getSession();
  if (session) {
    const u = session.user;
    if (u.role === "doctor" && row.d.userId === u.id) {
      if (!session.mfaVerified) return null;
      return { ...base, role: "doctor", displayName: row.d.fullName, userId: u.id, inviteId: null };
    }
    if (row.p.userId === u.id) return { ...base, role: "patient", displayName: row.p.fullName, userId: u.id, inviteId: null };
    const [link] = await db
      .select()
      .from(familyLinks)
      .where(and(eq(familyLinks.patientId, row.p.id), eq(familyLinks.caregiverUserId, u.id), eq(familyLinks.status, "active"), eq(familyLinks.canJoin, true)));
    if (link) {
      // A caregiver who booked for someone without their own login joins as the patient's side.
      return { ...base, role: "caregiver", displayName: `${u.name} (${link.relationship})`, userId: u.id, inviteId: null };
    }
  }
  const token = (await cookies()).get(guestCookie(apptId))?.value;
  if (token) {
    const [inv] = await db
      .select()
      .from(appointmentInvites)
      .where(and(eq(appointmentInvites.appointmentId, apptId), eq(appointmentInvites.tokenHash, sha256(token)), isNull(appointmentInvites.revokedAt), gt(appointmentInvites.expiresAt, new Date())));
    if (inv) return { ...base, role: inv.role as RoomRole, displayName: `${inv.name} (${inv.role === "interpreter" ? "Interpreter" : "Family"})`, userId: null, inviteId: inv.id };
  }
  return null;
}

export async function createInvite(apptId: string, byUserId: string, role: "caregiver" | "interpreter", name: string, contact?: string | null) {
  const db = await getDb();
  const [a] = await db.select().from(appointments).where(eq(appointments.id, apptId));
  if (!a) throw new Error("Not found");
  const token = randomToken(24);
  await db.insert(appointmentInvites).values({
    appointmentId: apptId,
    role,
    name: name.slice(0, 80),
    contact: contact ?? null,
    tokenHash: sha256(token),
    createdByUserId: byUserId,
    expiresAt: new Date(a.endAt.getTime() + 2 * 3600_000),
  });
  return `${env.appUrl}/join/${token}`;
}

export async function redeemInvite(token: string) {
  const db = await getDb();
  const [inv] = await db
    .select()
    .from(appointmentInvites)
    .where(and(eq(appointmentInvites.tokenHash, sha256(token)), isNull(appointmentInvites.revokedAt), gt(appointmentInvites.expiresAt, new Date())));
  if (!inv) return null;
  if (!inv.usedAt) await db.update(appointmentInvites).set({ usedAt: new Date() }).where(eq(appointmentInvites.id, inv.id));
  return inv;
}

/** Waiting room: queue position and estimated wait for this patient. */
export async function queueInfo(db: Executor, a: typeof appointments.$inferSelect, d: typeof doctors.$inferSelect) {
  const ahead = await db
    .select({ id: appointments.id, startAt: appointments.startAt, status: appointments.status })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, d.id),
        ne(appointments.id, a.id),
        inArray(appointments.status, ["confirmed", "in_progress"]),
        sql`${appointments.mode} <> 'in_clinic'`,
        lte(appointments.startAt, a.startAt),
        gt(appointments.startAt, new Date(Date.now() - 3 * 3600_000)),
        sql`(${appointments.status} = 'in_progress' or ${appointments.queueJoinedAt} is not null)`,
      ),
    );
  const inConsult = ahead.some((x) => x.status === "in_progress");
  const waitingAhead = ahead.filter((x) => x.status !== "in_progress").length;
  const untilStart = Math.max(0, Math.round((a.startAt.getTime() - Date.now()) / 60_000));
  const estimate = Math.max(untilStart, (inConsult ? Math.ceil(d.consultMinutes / 2) : 0) + waitingAhead * d.consultMinutes) + a.doctorRunningLateMinutes;
  return { position: waitingAhead + 1, doctorBusy: inConsult, estimatedMinutes: estimate, runningLate: a.doctorRunningLateMinutes };
}

export async function joinRoom(access: RoomAccess) {
  const db = await getDb();
  const peerId = randomToken(12);
  await db.insert(roomParticipants).values({
    peerId,
    appointmentId: access.appointment.id,
    userId: access.userId,
    inviteId: access.inviteId,
    role: access.role,
    displayName: access.displayName,
  });
  const now = new Date();
  const a = access.appointment;
  if (access.role === "doctor") {
    await db
      .update(appointments)
      .set({ doctorJoinedAt: a.doctorJoinedAt ?? now, startedAt: a.startedAt ?? now, status: a.status === "confirmed" ? "in_progress" : a.status })
      .where(eq(appointments.id, a.id));
  } else if (access.role === "patient" || access.role === "caregiver") {
    await db.update(appointments).set({ patientJoinedAt: a.patientJoinedAt ?? now, queueJoinedAt: a.queueJoinedAt ?? now }).where(eq(appointments.id, a.id));
  }
  await audit({ actor: access.userId ? { id: access.userId, role: access.role } : null, action: "room.join", entityType: "appointment", entityId: a.id, patientId: a.patientId, metadata: { role: access.role, peerId } }, db);
  return peerId;
}

export async function leaveRoom(apptId: string, peerId: string) {
  const db = await getDb();
  await db.update(roomParticipants).set({ leftAt: new Date() }).where(and(eq(roomParticipants.peerId, peerId), eq(roomParticipants.appointmentId, apptId)));
  await db.insert(signals).values(
    (await activePeers(db, apptId))
      .filter((p) => p.peerId !== peerId)
      .map((p) => ({ appointmentId: apptId, fromPeer: peerId, toPeer: p.peerId, kind: "bye", payload: {} })),
  ).catch(() => {});
}

async function activePeers(db: Executor, apptId: string) {
  return db
    .select({ peerId: roomParticipants.peerId, role: roomParticipants.role, displayName: roomParticipants.displayName, media: roomParticipants.media, joinedAt: roomParticipants.joinedAt })
    .from(roomParticipants)
    .where(and(eq(roomParticipants.appointmentId, apptId), isNull(roomParticipants.leftAt), gt(roomParticipants.lastSeenAt, new Date(Date.now() - 20_000))))
    .orderBy(asc(roomParticipants.joinedAt));
}

export async function pollRoom(access: RoomAccess, peerId: string, sinceSignal: number, sinceMessage: number) {
  const db = await getDb();
  const apptId = access.appointment.id;
  const [me] = await db
    .update(roomParticipants)
    .set({ lastSeenAt: new Date() })
    .where(and(eq(roomParticipants.peerId, peerId), eq(roomParticipants.appointmentId, apptId), isNull(roomParticipants.leftAt)))
    .returning();
  if (!me) return null;
  const [sig, peers, msgs, [a]] = await Promise.all([
    db.select().from(signals).where(and(eq(signals.toPeer, peerId), gt(signals.id, sinceSignal))).orderBy(asc(signals.id)).limit(200),
    activePeers(db, apptId),
    db.select().from(messages).where(and(eq(messages.appointmentId, apptId), gt(messages.id, sinceMessage))).orderBy(asc(messages.id)).limit(200),
    db.select().from(appointments).where(eq(appointments.id, apptId)),
  ]);
  const queue = access.role !== "doctor" && a && !peers.some((p) => p.role === "doctor") ? await queueInfo(db, a, access.doctor) : null;
  return {
    signals: sig.map((s) => ({ id: s.id, from: s.fromPeer, kind: s.kind, payload: s.payload })),
    peers: peers.filter((p) => p.peerId !== peerId),
    messages: msgs.map((m) => ({ id: m.id, senderRole: m.senderRole, senderName: m.senderName, body: m.body, documentId: m.documentId, kind: m.kind, createdAt: m.createdAt.toISOString(), mine: access.userId ? m.senderUserId === access.userId : m.senderName === access.displayName })),
    state: a
      ? { status: a.status, recording: a.recording ?? null, mode: a.mode, endedAt: a.endedAt?.toISOString() ?? null, outcome: a.outcome, runningLate: a.doctorRunningLateMinutes, identityConfirmed: Boolean(a.identityConfirmedAt) }
      : null,
    queue,
  };
}

export async function sendSignal(apptId: string, fromPeer: string, toPeer: string, kind: string, payload: unknown) {
  const db = await getDb();
  const [from] = await db.select().from(roomParticipants).where(and(eq(roomParticipants.peerId, fromPeer), eq(roomParticipants.appointmentId, apptId)));
  const [to] = await db.select().from(roomParticipants).where(and(eq(roomParticipants.peerId, toPeer), eq(roomParticipants.appointmentId, apptId)));
  if (!from || !to) return false;
  await db.insert(signals).values({ appointmentId: apptId, fromPeer, toPeer, kind: kind.slice(0, 20), payload: payload as object });
  return true;
}

export async function updateMedia(apptId: string, peerId: string, media: { audio: boolean; video: boolean; screen?: boolean; lowBandwidth?: boolean }) {
  const db = await getDb();
  await db.update(roomParticipants).set({ media }).where(and(eq(roomParticipants.peerId, peerId), eq(roomParticipants.appointmentId, apptId)));
}

export async function postRoomMessage(access: RoomAccess, body: string, documentId?: string | null, kind: "text" | "file" | "system" = "text") {
  const db = await getDb();
  const [m] = await db
    .insert(messages)
    .values({
      appointmentId: access.appointment.id,
      patientId: access.appointment.patientId,
      senderUserId: access.userId,
      senderRole: access.role,
      senderName: access.displayName,
      body: body.slice(0, 4000),
      documentId: documentId ?? null,
      kind,
    })
    .returning();
  return m!;
}

/**
 * Recording is off by default. It starts only when both the doctor and the
 * patient side have agreed, and everyone sees that it is on.
 */
export async function setRecordingConsent(access: RoomAccess, agree: boolean) {
  const db = await getDb();
  const [a] = await db.select().from(appointments).where(eq(appointments.id, access.appointment.id));
  const current: RecordingConsent = a?.recording ?? {};
  const side = access.role === "doctor" ? "doctor" : "patient";
  const next: RecordingConsent = { ...current, [side]: agree, requestedBy: current.requestedBy ?? side };
  if (!agree) {
    next.doctor = side === "doctor" ? false : current.doctor;
    next.patient = side === "patient" ? false : current.patient;
    if (current.startedAt && !current.stoppedAt) next.stoppedAt = new Date().toISOString();
  }
  if (next.doctor && next.patient && !current.startedAt) next.startedAt = new Date().toISOString();
  await db.update(appointments).set({ recording: next }).where(eq(appointments.id, access.appointment.id));
  await postRoomMessage(
    access,
    agree ? (next.doctor && next.patient ? "Recording started. Both sides agreed." : `${access.displayName} asked to record this consult.`) : "Recording is off.",
    null,
    "system",
  );
  await audit({ actor: access.userId ? { id: access.userId, role: access.role } : null, action: agree ? "recording.consent" : "recording.decline", entityType: "appointment", entityId: access.appointment.id, patientId: access.appointment.patientId }, db);
  return next;
}

/** Remove signalling rows and stale participants (privacy and table size). */
export async function cleanupRooms() {
  const db = await getDb();
  await db.delete(signals).where(lt(signals.createdAt, new Date(Date.now() - 30 * 60_000)));
  await db.update(roomParticipants).set({ leftAt: new Date() }).where(and(isNull(roomParticipants.leftAt), lt(roomParticipants.lastSeenAt, new Date(Date.now() - 5 * 60_000))));
}

export async function iceServers() {
  const t = env.turn;
  return [{ urls: env.stunUrls }, ...(t.urls.length ? [{ urls: t.urls, username: t.username, credential: t.credential }] : [])];
}

export async function displayNameFor(userId: string) {
  const db = await getDb();
  const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
  return u?.name ?? "";
}
