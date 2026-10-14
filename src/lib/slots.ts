import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { Executor } from "@/db";
import { availabilityRules, availabilitySlots } from "@/db/schema";
import { addDays, dayInZone, weekdayInZone, zonedTimeToUtc, addMinutes } from "./time";

/**
 * Turn weekly availability rules into bookable slots for the next `days`.
 * Safe to run repeatedly: existing slots are left alone.
 */
export async function materializeSlots(db: Executor, opts: { doctorId?: string; days?: number; now?: Date } = {}) {
  const days = opts.days ?? 21;
  const now = opts.now ?? new Date();
  const rules = await db
    .select()
    .from(availabilityRules)
    .where(and(eq(availabilityRules.active, true), opts.doctorId ? eq(availabilityRules.doctorId, opts.doctorId) : undefined));

  const rows: (typeof availabilitySlots.$inferInsert)[] = [];
  for (const rule of rules) {
    const today = dayInZone(now, rule.timeZone);
    for (let i = 0; i < days; i++) {
      const day = addDays(today, i);
      const probe = zonedTimeToUtc(day, "12:00", rule.timeZone);
      if (weekdayInZone(probe, rule.timeZone) !== rule.weekday) continue;
      let start = zonedTimeToUtc(day, rule.startTime, rule.timeZone);
      const end = zonedTimeToUtc(day, rule.endTime, rule.timeZone);
      while (addMinutes(start, rule.slotMinutes) <= end) {
        if (start > now) {
          rows.push({
            doctorId: rule.doctorId,
            ruleId: rule.id,
            group: rule.group,
            clinicId: rule.clinicId,
            startAt: start,
            endAt: addMinutes(start, rule.slotMinutes),
            timeZone: rule.timeZone,
          });
        }
        start = addMinutes(start, rule.slotMinutes);
      }
    }
  }
  for (let i = 0; i < rows.length; i += 500) {
    await db.insert(availabilitySlots).values(rows.slice(i, i + 500)).onConflictDoNothing();
  }
  return rows.length;
}

/** Remove future open slots that came from a rule (when a rule is edited or removed). */
export async function clearOpenSlotsForRules(db: Executor, ruleIds: string[]) {
  if (!ruleIds.length) return;
  await db
    .delete(availabilitySlots)
    .where(
      and(
        inArray(availabilitySlots.ruleId, ruleIds),
        eq(availabilitySlots.status, "open"),
        gte(availabilitySlots.startAt, new Date()),
      ),
    );
}

/** Release payment holds that have expired. */
export async function releaseExpiredHolds(db: Executor, now = new Date()) {
  await db
    .update(availabilitySlots)
    .set({ status: "open", heldUntil: null, appointmentId: null })
    .where(and(eq(availabilitySlots.status, "held"), lt(availabilitySlots.heldUntil, now)));
}

/** A slot is free if open, or held with an expired hold. */
export const slotIsFree = sql`(${availabilitySlots.status} = 'open' or (${availabilitySlots.status} = 'held' and ${availabilitySlots.heldUntil} < now()))`;
