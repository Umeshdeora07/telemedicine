import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { getDb, type Executor } from "@/db";
import { appointments, familyLinks, notifications, patients, pushSubscriptions, users } from "@/db/schema";
import { env } from "@/config/env";
import { brand } from "@/config/brand";
import { loadDictionary } from "@/i18n/dictionaries";
import { intlLocale, isEnabledLocale } from "@/i18n/config";
import { makeTranslator } from "@/i18n/translate";
import { formatDateTime, zoneLabel } from "@/lib/format";
import { sendEmail, sendPush, sendSms, sendWhatsApp } from "./channels";

type Channel = "in_app" | "sms" | "whatsapp" | "email" | "push";

export type NotifyInput = {
  template: string;
  title: string;
  body: string;
  link?: string;
  appointmentId?: string;
  sendAt?: Date;
  dedupeKey?: string;
  /** Channels to try (in-app is always included). Defaults to all the user has. */
  channels?: Channel[];
  payload?: Record<string, unknown>;
};

/** Queue a notification for a user on every channel they can receive. */
export async function notifyUser(db: Executor, userId: string, n: NotifyInput) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u || u.status !== "active") return;
  const subs = await db.select({ endpoint: pushSubscriptions.endpoint }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  const wanted = new Set<Channel>(n.channels ?? ["in_app", "sms", "whatsapp", "email", "push"]);
  wanted.add("in_app");
  const channels: Channel[] = [];
  if (wanted.has("in_app")) channels.push("in_app");
  if (wanted.has("whatsapp") && u.phone && u.whatsappOptIn) channels.push("whatsapp");
  // SMS only when WhatsApp isn't available, to avoid duplicate messages.
  else if (wanted.has("sms") && u.phone) channels.push("sms");
  if (wanted.has("email") && u.email) channels.push("email");
  if (wanted.has("push") && subs.length) channels.push("push");

  const sendAt = n.sendAt ?? new Date();
  for (const channel of channels) {
    await db
      .insert(notifications)
      .values({
        userId,
        channel,
        template: n.template,
        title: n.title,
        body: n.body,
        link: n.link,
        appointmentId: n.appointmentId,
        payload: n.payload ?? {},
        sendAt,
        status: channel === "in_app" && sendAt <= new Date() ? "sent" : "scheduled",
        sentAt: channel === "in_app" && sendAt <= new Date() ? new Date() : null,
        dedupeKey: n.dedupeKey ? `${n.dedupeKey}:${userId}:${channel}` : undefined,
      })
      .onConflictDoNothing();
  }
}

/** Send everything that is due. Runs from the scheduler every minute. */
export async function dispatchDue(limit = 100) {
  const db = await getDb();
  const due = await db
    .select({ n: notifications, u: users })
    .from(notifications)
    .leftJoin(users, eq(users.id, notifications.userId))
    .where(and(eq(notifications.status, "scheduled"), lte(notifications.sendAt, new Date())))
    .orderBy(notifications.sendAt)
    .limit(limit);
  for (const { n, u } of due) {
    let result: { ok: boolean; error?: string } = { ok: true };
    const link = n.link ? `${env.appUrl}${n.link}` : "";
    const text = `${n.title}\n${n.body}${link ? `\n${link}` : ""}\n${brand.name}`;
    try {
      if (n.channel === "in_app") result = { ok: true };
      else if (n.channel === "sms") result = await sendSms(n.to ?? u?.phone ?? "", text);
      else if (n.channel === "whatsapp") result = await sendWhatsApp(n.to ?? u?.phone ?? "", { text });
      else if (n.channel === "email") result = await sendEmail(n.to ?? u?.email ?? "", n.title, `${n.body}\n\n${link}`);
      else if (n.channel === "push" && u) {
        const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, u.id));
        for (const sub of subs) {
          const r = await sendPush({ endpoint: sub.endpoint, keys: sub.keys }, { title: n.title, body: n.body, url: n.link ?? "/" });
          if (!r.ok && /410|404/.test(r.error)) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
        }
      }
    } catch (e) {
      result = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    await db
      .update(notifications)
      .set(result.ok ? { status: "sent", sentAt: new Date(), error: null } : { status: "failed", error: result.error?.slice(0, 500) })
      .where(eq(notifications.id, n.id));
  }
  return due.length;
}

/** Everyone who should hear about an appointment: booker, the patient, and consenting caregivers. */
export async function appointmentRecipients(db: Executor, appointmentId: string) {
  const [a] = await db
    .select({ bookedBy: appointments.bookedByUserId, patientUser: patients.userId, patientId: appointments.patientId })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(eq(appointments.id, appointmentId));
  if (!a) return [];
  const carers = await db
    .select({ id: familyLinks.caregiverUserId })
    .from(familyLinks)
    .where(and(eq(familyLinks.patientId, a.patientId), eq(familyLinks.status, "active"), eq(familyLinks.receivesNotifications, true)));
  return [...new Set([a.bookedBy, a.patientUser, ...carers.map((c) => c.id)].filter(Boolean) as string[])];
}

async function translatorFor(userId: string, db: Executor) {
  const [u] = await db.select({ language: users.language, tz: users.timeZone }).from(users).where(eq(users.id, userId));
  const locale = isEnabledLocale(u?.language) ? u.language : "en";
  const dict = await loadDictionary(locale);
  return { ...makeTranslator(dict, intlLocale(locale)), intl: intlLocale(locale), tz: u?.tz ?? "Asia/Kolkata" };
}

const REMINDER_OFFSETS = [
  { key: "24h", minutes: 24 * 60 },
  { key: "1h", minutes: 60 },
  { key: "10m", minutes: 10 },
];

/** Reminders by SMS/WhatsApp, email and push at 24 hours, 1 hour and 10 minutes before. */
export async function scheduleAppointmentReminders(db: Executor, appointmentId: string) {
  const [row] = await db
    .select({ a: appointments, patientName: patients.fullName, doctorName: sql<string>`(select full_name from doctors where id = ${appointments.doctorId})` })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .where(eq(appointments.id, appointmentId));
  if (!row) return;
  const { a } = row;
  const recipients = await appointmentRecipients(db, appointmentId);
  for (const userId of recipients) {
    const { t, intl, tz } = await translatorFor(userId, db);
    const when = `${formatDateTime(a.startAt, tz, intl)} ${zoneLabel(tz, a.startAt, intl)}`;
    const isClinic = a.mode === "in_clinic";
    for (const o of REMINDER_OFFSETS) {
      const sendAt = new Date(a.startAt.getTime() - o.minutes * 60_000);
      if (sendAt <= new Date()) continue;
      const title =
        o.key === "24h"
          ? t("Reminder: consult tomorrow")
          : o.key === "1h"
            ? t("Your consult starts in 1 hour")
            : isClinic
              ? t("Your clinic visit is in 10 minutes")
              : t("Join your consult now");
      const body = isClinic
        ? t("{patient} has a clinic visit with {doctor} at {when}. Show the visit pass QR at reception.", { patient: row.patientName, doctor: row.doctorName, when })
        : t("{patient} has a consult with {doctor} at {when}. Do the tech check before joining.", { patient: row.patientName, doctor: row.doctorName, when });
      await notifyUser(db, userId, {
        template: `reminder_${o.key}`,
        title,
        body,
        link: isClinic ? `/consults/${a.id}/pass` : `/consult/${a.id}`,
        appointmentId: a.id,
        sendAt,
        dedupeKey: `appt:${a.id}:${o.key}`,
        channels: o.key === "10m" ? ["in_app", "push", "whatsapp", "sms"] : undefined,
      });
    }
  }
}

export async function cancelAppointmentReminders(db: Executor, appointmentId: string) {
  await db
    .update(notifications)
    .set({ status: "cancelled" })
    .where(and(eq(notifications.appointmentId, appointmentId), eq(notifications.status, "scheduled")));
}

/** Notify all recipients of an appointment now. */
export async function notifyAppointment(
  db: Executor,
  appointmentId: string,
  build: (t: Awaited<ReturnType<typeof translatorFor>>) => Omit<NotifyInput, "appointmentId">,
) {
  for (const userId of await appointmentRecipients(db, appointmentId)) {
    const tr = await translatorFor(userId, db);
    await notifyUser(db, userId, { ...build(tr), appointmentId });
  }
}

export async function markAllRead(db: Executor, userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.channel, "in_app"), sql`${notifications.readAt} is null`));
}

export async function unreadCount(db: Executor, userId: string) {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.channel, "in_app"),
        inArray(notifications.status, ["sent"]),
        sql`${notifications.readAt} is null`,
      ),
    );
  return r?.n ?? 0;
}
