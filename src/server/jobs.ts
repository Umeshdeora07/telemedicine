import "server-only";
import { and, eq, isNotNull, lt, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, doctorLicences, doctors, medicineReminders, patients, familyLinks, secondOpinions, subscriptions, settings } from "@/db/schema";
import { dispatchDue, notifyUser } from "@/server/notify";
import { expireStaleDrafts, handleDoctorNoShows } from "@/server/booking";
import { materializeSlots, releaseExpiredHolds } from "@/lib/slots";
import { cleanupRooms } from "@/server/room";
import { secondOpinionDoctors } from "@/server/second-opinion";
import { audit } from "@/server/audit";
import { dayInZone, zonedTimeToUtc } from "@/lib/time";

type JobResult = Record<string, number | string>;

/** Medicine reminders: notify the patient (and family who get reminders) at each dose time. */
async function doseReminders(now: Date, windowMs: number) {
  const db = await getDb();
  const rows = await db.select({ r: medicineReminders, ownerId: patients.ownerUserId, userId: patients.userId, name: patients.fullName }).from(medicineReminders).innerJoin(patients, eq(patients.id, medicineReminders.patientId)).where(eq(medicineReminders.active, true));
  let sent = 0;
  for (const { r, ownerId, userId, name } of rows) {
    const day = dayInZone(now, r.timeZone);
    if (r.startDate > day || (r.endDate && r.endDate < day)) continue;
    for (const time of r.times) {
      const at = zonedTimeToUtc(day, time, r.timeZone);
      if (at > now || now.getTime() - at.getTime() > windowMs) continue;
      const recipients = new Set([userId ?? ownerId]);
      const fam = await db.select({ id: familyLinks.caregiverUserId }).from(familyLinks).where(and(eq(familyLinks.patientId, r.patientId), eq(familyLinks.status, "active"), eq(familyLinks.receivesNotifications, true)));
      fam.forEach((f) => recipients.add(f.id));
      for (const uid of recipients) {
        await notifyUser(db, uid, { template: "dose_reminder", title: `Time for ${r.name}`, body: `${name}: ${r.dose}${r.instructions ? ` · ${r.instructions}` : ""}`, link: "/reminders", dedupeKey: `dose:${r.id}:${at.toISOString()}:${uid}`, channels: ["in_app", "push", "whatsapp"] });
        sent++;
      }
    }
    if (r.refillAlertDate === day) {
      await notifyUser(db, userId ?? ownerId, { template: "refill_alert", title: `Refill soon: ${r.name}`, body: `${name}'s ${r.name} runs out in about 3 days.`, link: "/reminders", dedupeKey: `refill:${r.id}:${day}` });
    }
  }
  return sent;
}

/** Licences: remind at 60 and 15 days, mark expired ones (which hides the doctor there). */
async function licenceChecks(now: Date) {
  const db = await getDb();
  const today = now.toISOString().slice(0, 10);
  const expired = await db.update(doctorLicences).set({ status: "expired" }).where(and(eq(doctorLicences.status, "verified"), isNotNull(doctorLicences.expiresAt), lt(doctorLicences.expiresAt, today))).returning();
  for (const l of expired) await audit({ actor: null, action: "licence.expired", entityType: "doctor", entityId: l.doctorId, metadata: { licenceId: l.id, country: l.country } });
  const soon = await db
    .select({ l: doctorLicences, userId: doctors.userId })
    .from(doctorLicences)
    .innerJoin(doctors, eq(doctors.id, doctorLicences.doctorId))
    .where(and(eq(doctorLicences.status, "verified"), isNotNull(doctorLicences.expiresAt), lte(doctorLicences.expiresAt, new Date(now.getTime() + 60 * 86400_000).toISOString().slice(0, 10))));
  let reminded = 0;
  for (const { l, userId } of soon) {
    const days = Math.ceil((new Date(l.expiresAt!).getTime() - now.getTime()) / 86400_000);
    const mark = days <= 15 ? "15" : "60";
    if (l.remindersSent.includes(mark) || !userId) continue;
    await notifyUser(db, userId, { template: "licence_expiring", title: `Your ${l.country} licence expires in ${days} days`, body: `${l.issuingBody} ${l.number}. Upload the renewal so patients there can still see you.`, link: "/doctor/licences", channels: ["in_app", "email", "sms"] });
    await db.update(doctorLicences).set({ remindersSent: [...l.remindersSent, mark] }).where(eq(doctorLicences.id, l.id));
    reminded++;
  }
  // Annual re-verification: flag doctors whose check is due (admins see them in the queue).
  const due = await db.select({ id: doctors.id, userId: doctors.userId, at: doctors.reverifyDueAt }).from(doctors).where(and(eq(doctors.verificationStatus, "approved"), isNotNull(doctors.reverifyDueAt), lte(doctors.reverifyDueAt, new Date(now.getTime() + 30 * 86400_000))));
  for (const d of due) if (d.userId) await notifyUser(db, d.userId, { template: "reverify_due", title: "Annual re-verification due", body: "Please make sure your registration documents are current.", link: "/doctor/licences", dedupeKey: `reverify:${d.id}:${d.at?.toISOString().slice(0, 7)}` });
  return { expired: expired.length, reminded };
}

/** Second opinions paid while no specialist was free: try to assign again; flag overdue ones. */
async function secondOpinionQueue(now: Date) {
  const db = await getDb();
  const waiting = await db.select().from(secondOpinions).where(eq(secondOpinions.status, "submitted"));
  let assigned = 0;
  for (const so of waiting) {
    const [doc] = await secondOpinionDoctors(so.specialtyId, { country: so.patientLocationCountry, region: so.patientLocationRegion });
    if (!doc) continue;
    await db.update(secondOpinions).set({ status: "assigned", doctorId: doc.id, dueAt: new Date(now.getTime() + 48 * 3600_000) }).where(eq(secondOpinions.id, so.id));
    if (doc.userId) await notifyUser(db, doc.userId, { template: "second_opinion_assigned", title: "New second opinion request", body: `Case ${so.ref}: please reply within 48 hours.`, link: `/doctor/second-opinions/${so.id}` });
    assigned++;
  }
  const overdue = await db.select({ s: secondOpinions, userId: doctors.userId }).from(secondOpinions).innerJoin(doctors, eq(doctors.id, secondOpinions.doctorId)).where(and(eq(secondOpinions.status, "assigned"), lt(secondOpinions.dueAt, now)));
  for (const o of overdue) if (o.userId) await notifyUser(db, o.userId, { template: "second_opinion_overdue", title: `Second opinion ${o.s.ref} is overdue`, body: "The patient is waiting for your opinion.", link: `/doctor/second-opinions/${o.s.id}`, dedupeKey: `so-overdue:${o.s.id}:${now.toISOString().slice(0, 13)}` });
  return assigned;
}

/** Monthly plans: expire unpaid renewals and reset consult counts (demo: no auto-charge). */
async function planRenewals(now: Date) {
  const db = await getDb();
  const ended = await db.update(subscriptions).set({ status: "expired" }).where(and(eq(subscriptions.status, "active"), lt(subscriptions.periodEnd, now))).returning();
  for (const s of ended) await notifyUser(db, s.userId, { template: "plan_expired", title: "Your care plan has ended", body: "Renew to keep consults covered.", link: "/plans" });
  return ended.length;
}

/** Ended consults whose follow-up chat window closed: nothing to do but keep stats tidy. */
async function staleInProgress(now: Date) {
  const db = await getDb();
  // Consults left "in progress" for 3+ hours (both sides disconnected) are closed as completed.
  const r = await db
    .update(appointments)
    .set({ status: "completed", endedAt: now, endedBy: "system" })
    .where(and(eq(appointments.status, "in_progress"), lt(appointments.endAt, new Date(now.getTime() - 3 * 3600_000))))
    .returning({ id: appointments.id });
  return r.length;
}

async function lastRun(key: string) {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.key, `job:${key}`));
  return row ? new Date(String(row.value)) : null;
}

async function markRun(key: string, at: Date) {
  const db = await getDb();
  await db.insert(settings).values({ key: `job:${key}`, value: at.toISOString() }).onConflictDoUpdate({ target: settings.key, set: { value: at.toISOString(), updatedAt: at } });
}

let running = false;

/** One scheduler tick. Safe to call every minute from a timer or a cron HTTP call. */
export async function tick(now = new Date()): Promise<JobResult> {
  if (running) return { skipped: "already running" };
  running = true;
  const out: JobResult = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      const r = await fn();
      if (typeof r === "number") out[name] = r;
      else if (r && typeof r === "object") Object.assign(out, Object.fromEntries(Object.entries(r).map(([k, v]) => [`${name}.${k}`, v as number])));
    } catch (e) {
      console.error(`[jobs] ${name} failed`, e);
      out[name] = "error";
    }
  };
  try {
    const db = await getDb();
    await step("drafts", () => expireStaleDrafts(db, now));
    await step("holds", () => releaseExpiredHolds(db, now));
    await step("noShows", () => handleDoctorNoShows(now));
    await step("doses", () => doseReminders(now, 90_000));
    await step("notifications", () => dispatchDue());
    await step("rooms", () => cleanupRooms());
    await step("stale", () => staleInProgress(now));
    // Hourly jobs.
    const hourly = await lastRun("hourly");
    if (!hourly || now.getTime() - hourly.getTime() > 3600_000) {
      await step("secondOpinions", () => secondOpinionQueue(now));
      await step("plans", () => planRenewals(now));
      await markRun("hourly", now);
    }
    // Daily jobs.
    const daily = await lastRun("daily");
    if (!daily || now.getTime() - daily.getTime() > 20 * 3600_000) {
      await step("slots", () => materializeSlots(db, { days: 21, now }));
      await step("licences", () => licenceChecks(now));
      await markRun("daily", now);
    }
  } finally {
    running = false;
  }
  return out;
}


