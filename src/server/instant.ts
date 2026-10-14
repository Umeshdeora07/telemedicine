import "server-only";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, availabilitySlots, doctors, specialties } from "@/db/schema";
import { env } from "@/config/env";
import { visibleForLocation, type PatientLocation } from "./doctors";

/**
 * "Talk to a doctor now": first available verified doctor in the specialty,
 * licensed for the patient's location, matching language/gender if asked.
 * Doctors who are online now (or, in the demo, who take instant consults)
 * are matched to an immediate consult; otherwise the next slot within 20 min.
 */
export async function findInstantDoctor(loc: PatientLocation, specialtySlug: string, prefs: { language?: string; gender?: "female" | "male" }) {
  const db = await getDb();
  const conds = [visibleForLocation(loc), eq(specialties.slug, specialtySlug)];
  if (prefs.language) conds.push(sql`${prefs.language} = any(${doctors.languages})`);
  if (prefs.gender) conds.push(eq(doctors.gender, prefs.gender));
  const candidates = await db
    .select({ d: doctors })
    .from(doctors)
    .innerJoin(specialties, eq(specialties.id, doctors.specialtyId))
    .where(and(...conds));
  if (!candidates.length) return null;
  const now = new Date();
  const online = candidates.filter((c) => c.d.acceptsInstant && ((c.d.availableNowUntil && c.d.availableNowUntil > now) || env.demoMode));
  if (online.length) {
    const queues = await db
      .select({ doctorId: appointments.doctorId, n: sql<number>`count(*)::int` })
      .from(appointments)
      .where(and(inArray(appointments.doctorId, online.map((o) => o.d.id)), eq(appointments.kind, "instant"), inArray(appointments.status, ["confirmed", "in_progress"])))
      .groupBy(appointments.doctorId);
    const best = online
      .map((o) => ({ ...o, waiting: queues.find((q) => q.doctorId === o.d.id)?.n ?? 0 }))
      .sort((a, b) => a.waiting - b.waiting || Number(b.d.ratingAvg) - Number(a.d.ratingAvg))[0]!;
    return { doctor: best.d, slot: null, waitMinutes: Math.max(2, best.waiting * best.d.consultMinutes) };
  }
  const [slot] = await db
    .select({ s: availabilitySlots, d: doctors })
    .from(availabilitySlots)
    .innerJoin(doctors, eq(doctors.id, availabilitySlots.doctorId))
    .where(
      and(
        inArray(availabilitySlots.doctorId, candidates.map((c) => c.d.id)),
        eq(availabilitySlots.group, "online"),
        gt(availabilitySlots.startAt, now),
        sql`${availabilitySlots.startAt} < now() + interval '20 minutes'`,
        sql`(${availabilitySlots.status} = 'open' or (${availabilitySlots.status} = 'held' and ${availabilitySlots.heldUntil} < now()))`,
      ),
    )
    .orderBy(asc(availabilitySlots.startAt))
    .limit(1);
  if (slot) return { doctor: slot.d, slot: slot.s, waitMinutes: Math.max(1, Math.round((slot.s.startAt.getTime() - now.getTime()) / 60_000)) };
  return { doctor: null, slot: null, waitMinutes: null };
}
