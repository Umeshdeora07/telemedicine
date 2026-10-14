import "server-only";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { roomParticipants } from "@/db/schema";
import { getRoomAccess, type RoomAccess } from "./room";

/** Resolve room access for an API call, optionally checking the caller owns the peer id. */
export async function roomGuard(apptId: string, peerId?: string | null): Promise<{ access: RoomAccess } | { error: NextResponse }> {
  const access = await getRoomAccess(apptId);
  if (!access) return { error: NextResponse.json({ error: "You don't have access to this consult." }, { status: 403 }) };
  if (peerId) {
    const db = await getDb();
    const [p] = await db.select().from(roomParticipants).where(and(eq(roomParticipants.peerId, peerId), eq(roomParticipants.appointmentId, apptId)));
    const owns = p && (access.userId ? p.userId === access.userId : p.inviteId === access.inviteId);
    if (!owns) return { error: NextResponse.json({ error: "Session expired. Please rejoin." }, { status: 409 }) };
  }
  return { access };
}

export function joinWindow(a: { startAt: Date; endAt: Date; status: string; kind: string; mode: string }, role: string) {
  if (!["confirmed", "in_progress"].includes(a.status)) return { ok: false as const, reason: a.status === "completed" ? "ended" : "not_active" };
  if (a.mode === "in_clinic") return { ok: false as const, reason: "in_clinic" };
  const now = Date.now();
  const opens = a.startAt.getTime() - (role === "doctor" ? 60 : 30) * 60_000;
  const closes = a.endAt.getTime() + 3 * 3600_000;
  if (now < opens) return { ok: false as const, reason: "too_early", opensAt: new Date(opens) };
  if (now > closes) return { ok: false as const, reason: "ended" };
  return { ok: true as const };
}
