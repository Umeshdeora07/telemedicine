import "server-only";
import { and, eq, isNotNull, lt, lte } from "drizzle-orm";
import { getDb, withExclusiveLock } from "@/db";
import { appointments, doctorLicences, doctors, subscriptions, settings } from "@/db/schema";
import { dispatchDue, notifyUser } from "@/server/notify";
import { expireStaleDrafts, handleDoctorNoShows } from "@/server/booking";
import { materializeSlots, releaseExpiredHolds } from "@/lib/slots";
import { cleanupRooms } from "@/server/room";
import { audit } from "@/server/audit";

type JobResult = Record<string, number | string>;

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
  for (const d of due) if (d.userId) await notifyUser(db, d.userId, { template: "reverify_due", title: "Yearly registration check due", body: "Please make sure your registration documents are current.", link: "/doctor/licences", dedupeKey: `reverify:${d.id}:${d.at?.toISOString().slice(0, 7)}` });
  return { expired: expired.length, reminded };
}

/** Care plans (no longer sold): end any that are still active once their period is over. */
async function planRenewals(now: Date) {
  const db = await getDb();
  const ended = await db.update(subscriptions).set({ status: "expired" }).where(and(eq(subscriptions.status, "active"), lt(subscriptions.periodEnd, now))).returning();
  for (const s of ended) await notifyUser(db, s.userId, { template: "plan_expired", title: "Your care plan has ended", body: "Your consults are no longer covered by the plan.", link: "/dashboard" });
  return ended.length;
}

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
  try {
    // Another server (a deploy overlapping the old one, a second instance, or
    // the cron endpoint) may be ticking too: only one runs, so messages go once.
    return (await withExclusiveLock(20261016, () => runJobs(now))) ?? { skipped: "another server is running jobs" };
  } finally {
    running = false;
  }
}

async function runJobs(now: Date): Promise<JobResult> {
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
    await step("notifications", () => dispatchDue());
    await step("rooms", () => cleanupRooms());
    await step("stale", () => staleInProgress(now));
    // Hourly jobs.
    const hourly = await lastRun("hourly");
    if (!hourly || now.getTime() - hourly.getTime() > 3600_000) {
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
  } catch (e) {
    console.error("[jobs] tick failed", e);
  }
  return out;
}
