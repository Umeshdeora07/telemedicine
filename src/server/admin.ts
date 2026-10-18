import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  auditLogs,
  clinics,
  complaints,
  countries,
  coupons,
  dataRequests,
  doctorLicences,
  doctorQualifications,
  doctors,
  documents,
  exchangeRates,
  payments,
  refunds,
  reviews,
  securityIncidents,
  sessions,
  settings,
  specialties,
  users,
  type ComplaintUpdate,
} from "@/db/schema";
import type { SessionUser } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { notifyUser } from "@/server/notify";
import { refundPayment } from "@/server/booking";
import { UserError } from "@/lib/errors";

const actor = (u: SessionUser) => ({ id: u.id, role: u.role });

/* ------------------------------------------------------------ overview */

export async function adminOverview(days = 30) {
  const db = await getDb();
  const since = new Date(Date.now() - days * 86400_000);
  const daily = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${appointments.startAt} at time zone 'Asia/Kolkata'), 'YYYY-MM-DD')`,
      online: sql<number>`count(*) filter (where ${appointments.mode} <> 'in_clinic')`.mapWith(Number),
      clinic: sql<number>`count(*) filter (where ${appointments.mode} = 'in_clinic')`.mapWith(Number),
    })
    .from(appointments)
    .where(and(gte(appointments.startAt, since), inArray(appointments.status, ["completed", "confirmed", "checked_in", "in_progress"])))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  const [money] = await db
    .select({
      gmvInr: sql<number>`coalesce(sum(case when ${payments.currency} = 'INR' then ${payments.amountMinor} else round(${payments.amountMinor} / nullif(${payments.fxRate}, 0)) end), 0)`.mapWith(Number),
      refundedInr: sql<number>`coalesce(sum(case when ${payments.currency} = 'INR' then ${payments.refundedMinor} else round(${payments.refundedMinor} / nullif(${payments.fxRate}, 0)) end), 0)`.mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(payments)
    .where(and(gte(payments.createdAt, since), inArray(payments.status, ["captured", "partially_refunded", "refunded"])));
  const statusCounts = await db
    .select({ status: appointments.status, n: sql<number>`count(*)`.mapWith(Number) })
    .from(appointments)
    .where(gte(appointments.startAt, since))
    .groupBy(appointments.status);
  const bySpecialty = await db
    .select({ name: specialties.name, n: sql<number>`count(*)`.mapWith(Number) })
    .from(appointments)
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .innerJoin(specialties, eq(specialties.id, doctors.specialtyId))
    .where(and(gte(appointments.startAt, since), eq(appointments.status, "completed")))
    .groupBy(specialties.name)
    .orderBy(desc(sql`2`));
  // Where the people booking live (every consult itself is under India's rules).
  const byCountry = await db
    .select({ country: users.countryCode, n: sql<number>`count(*)`.mapWith(Number) })
    .from(appointments)
    .innerJoin(users, eq(users.id, appointments.bookedByUserId))
    .where(and(gte(appointments.startAt, since), inArray(appointments.status, ["completed", "confirmed"])))
    .groupBy(users.countryCode)
    .orderBy(desc(sql`2`));
  const [rating] = await db.select({ avg: sql<number>`coalesce(avg(${reviews.rating}), 0)`.mapWith(Number), n: sql<number>`count(*)`.mapWith(Number) }).from(reviews).where(gte(reviews.createdAt, since));
  const [pending] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(doctors).where(eq(doctors.verificationStatus, "submitted"));
  const [openComplaints] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(complaints).where(inArray(complaints.status, ["open", "acknowledged", "in_progress"]));
  const total = statusCounts.reduce((s, r) => s + r.n, 0);
  const noShow = statusCounts.find((r) => r.status === "doctor_no_show")?.n ?? 0;
  return { daily, money: money!, statusCounts, bySpecialty, byCountry, rating: rating!, pendingDoctors: pending!.n, openComplaints: openComplaints!.n, doctorNoShowRate: total ? noShow / total : 0, days };
}

/* -------------------------------------------------------- verification */

export async function verificationQueue() {
  const db = await getDb();
  return db
    .select({ d: doctors, specialty: specialties.name, email: users.email })
    .from(doctors)
    .innerJoin(specialties, eq(specialties.id, doctors.specialtyId))
    .leftJoin(users, eq(users.id, doctors.userId))
    .orderBy(sql`case ${doctors.verificationStatus} when 'submitted' then 0 when 'draft' then 1 when 'rejected' then 2 when 'approved' then 3 else 4 end`, asc(doctors.submittedAt), asc(doctors.fullName));
}

export async function doctorForReview(id: string) {
  const db = await getDb();
  const [row] = await db.select({ d: doctors, specialty: specialties.name, email: users.email, phone: users.phone }).from(doctors).innerJoin(specialties, eq(specialties.id, doctors.specialtyId)).leftJoin(users, eq(users.id, doctors.userId)).where(eq(doctors.id, id));
  if (!row) return null;
  const [lic, quals, docs, history] = await Promise.all([
    db.select().from(doctorLicences).where(eq(doctorLicences.doctorId, id)).orderBy(asc(doctorLicences.country)),
    db.select().from(doctorQualifications).where(eq(doctorQualifications.doctorId, id)),
    db.select().from(documents).where(and(eq(documents.doctorId, id), isNull(documents.deletedAt))),
    db.select({ l: auditLogs, name: users.name }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorUserId)).where(and(eq(auditLogs.entityType, "doctor"), eq(auditLogs.entityId, id))).orderBy(desc(auditLogs.createdAt)).limit(30),
  ]);
  return { ...row, lic, quals, docs, history };
}

export async function verifyLicence(admin: SessionUser, licenceId: string, input: { status: "verified" | "rejected" | "suspended"; reference: string; notes: string; evidenceDocumentId?: string | null }) {
  const db = await getDb();
  const [l] = await db
    .update(doctorLicences)
    .set({ status: input.status, verifiedBy: admin.id, verifiedAt: new Date(), verificationReference: input.reference, notes: input.notes || null, evidenceDocumentId: input.evidenceDocumentId ?? undefined })
    .where(eq(doctorLicences.id, licenceId))
    .returning();
  if (!l) throw new UserError("Licence not found");
  await audit({ actor: actor(admin), action: `licence.${input.status}`, entityType: "doctor", entityId: l.doctorId, metadata: { licenceId, country: l.country, region: l.region, reference: input.reference } });
  return l;
}

export async function decideDoctor(admin: SessionUser, doctorId: string, decision: "approve" | "reject" | "suspend" | "reinstate", reason: string) {
  const db = await getDb();
  const [d] = await db.select().from(doctors).where(eq(doctors.id, doctorId));
  if (!d) throw new UserError("Doctor not found");
  if (decision === "approve" || decision === "reinstate") {
    const lic = await db.select().from(doctorLicences).where(and(eq(doctorLicences.doctorId, doctorId), eq(doctorLicences.status, "verified")));
    if (!lic.length) throw new UserError("Verify at least one licence before approving.");
  }
  if (decision !== "approve" && decision !== "reinstate" && reason.trim().length < 5) throw new UserError("Write the reason the doctor will see.");
  const now = new Date();
  const status = decision === "approve" || decision === "reinstate" ? "approved" : decision === "reject" ? "rejected" : "suspended";
  await db
    .update(doctors)
    .set({
      verificationStatus: status,
      rejectionReason: status === "approved" ? null : reason,
      lastVerifiedAt: status === "approved" ? now : d.lastVerifiedAt,
      lastVerifiedBy: status === "approved" ? admin.id : d.lastVerifiedBy,
      reverifyDueAt: status === "approved" ? new Date(now.getTime() + 365 * 86400_000) : d.reverifyDueAt,
      availableNowUntil: status === "approved" ? d.availableNowUntil : null,
    })
    .where(eq(doctors.id, doctorId));
  await audit({ actor: actor(admin), action: `doctor.${decision}`, entityType: "doctor", entityId: doctorId, metadata: { reason } });
  if (d.userId)
    await notifyUser(db, d.userId, {
      template: `doctor_${status}`,
      title: status === "approved" ? "You're verified" : status === "rejected" ? "Verification needs changes" : "Your account is paused",
      body: status === "approved" ? "Patients can now find and book you." : reason,
      link: status === "approved" ? "/doctor" : "/doctor/onboarding",
    });
}

export async function clinicQueue() {
  const db = await getDb();
  return db.select().from(clinics).orderBy(sql`case ${clinics.verificationStatus} when 'submitted' then 0 else 1 end`, asc(clinics.name));
}

export async function decideClinic(admin: SessionUser, clinicId: string, approve: boolean) {
  const db = await getDb();
  await db.update(clinics).set({ verificationStatus: approve ? "approved" : "rejected", verifiedAt: new Date(), verifiedBy: admin.id }).where(eq(clinics.id, clinicId));
  await audit({ actor: actor(admin), action: approve ? "clinic.approve" : "clinic.reject", entityType: "clinic", entityId: clinicId });
}

/* ----------------------------------------------------- users & bookings */

export async function searchUsers(q: string) {
  const db = await getDb();
  const query = q.trim();
  return db
    .select()
    .from(users)
    .where(query ? or(ilike(users.name, `%${query}%`), ilike(users.email, `%${query}%`), ilike(users.phone, `%${query.replace(/[^\d+]/g, "")}%`)) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(50);
}

export async function setUserStatus(admin: SessionUser, userId: string, status: "active" | "suspended") {
  if (userId === admin.id) throw new UserError("You can't change your own account here.");
  const db = await getDb();
  await db.update(users).set({ status }).where(eq(users.id, userId));
  if (status === "suspended") await db.delete(sessions).where(eq(sessions.userId, userId));
  await audit({ actor: actor(admin), action: `user.${status}`, entityType: "user", entityId: userId });
}

export async function searchBookings(q: string, status?: string) {
  const db = await getDb();
  const { patients } = await import("@/db/schema");
  const query = q.trim();
  return db
    .select({ a: appointments, patientName: patients.fullName, doctorName: doctors.fullName })
    .from(appointments)
    .innerJoin(patients, eq(patients.id, appointments.patientId))
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .where(and(query ? or(ilike(appointments.ref, `%${query}%`), ilike(patients.fullName, `%${query}%`), ilike(doctors.fullName, `%${query}%`)) : undefined, status ? eq(appointments.status, status as (typeof appointments.$inferSelect)["status"]) : undefined))
    .orderBy(desc(appointments.startAt))
    .limit(80);
}

export async function paymentsWithRefunds() {
  const db = await getDb();
  const rows = await db.select({ p: payments, name: users.name }).from(payments).innerJoin(users, eq(users.id, payments.userId)).where(inArray(payments.status, ["captured", "partially_refunded", "refunded"])).orderBy(desc(payments.createdAt)).limit(100);
  const rf = rows.length ? await db.select().from(refunds).where(inArray(refunds.paymentId, rows.map((r) => r.p.id))).orderBy(desc(refunds.createdAt)) : [];
  return rows.map((r) => ({ ...r, refunds: rf.filter((x) => x.paymentId === r.p.id) }));
}

export async function adminRefund(admin: SessionUser, paymentId: string, amountMinor: number, reason: string) {
  const db = await getDb();
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!p) throw new UserError("Payment not found");
  const left = p.amountMinor - p.refundedMinor;
  if (amountMinor <= 0 || amountMinor > left) throw new UserError("Amount must be more than zero and not more than what's left.");
  if (reason.trim().length < 5) throw new UserError("Write a reason.");
  const r = await refundPayment(p.id, amountMinor, reason, "admin", admin.id); // also writes the audit entry
  if (!r || r.status !== "processed") throw new UserError("The payment gateway didn't accept the refund. Try again or refund manually.");
}

/* ------------------------------------------------- complaints / grievances */

export async function complaintList() {
  const db = await getDb();
  return db.select().from(complaints).orderBy(sql`case ${complaints.status} when 'open' then 0 when 'acknowledged' then 1 when 'in_progress' then 2 else 3 end`, asc(complaints.resolveBy));
}

export async function updateComplaint(admin: SessionUser, id: string, input: { status: "acknowledged" | "in_progress" | "resolved" | "closed"; note: string; public: boolean; resolution?: string }) {
  const db = await getDb();
  const [c] = await db.select().from(complaints).where(eq(complaints.id, id));
  if (!c) throw new UserError("Not found");
  const update: ComplaintUpdate = { at: new Date().toISOString(), by: admin.name, note: input.note, status: input.status, public: input.public };
  await db
    .update(complaints)
    .set({
      status: input.status,
      updates: [...c.updates, update],
      acknowledgedAt: c.acknowledgedAt ?? new Date(),
      resolvedAt: input.status === "resolved" || input.status === "closed" ? new Date() : c.resolvedAt,
      resolution: input.resolution || c.resolution,
      assignedToUserId: c.assignedToUserId ?? admin.id,
    })
    .where(eq(complaints.id, id));
  await audit({ actor: actor(admin), action: "complaint.update", entityType: "complaint", entityId: id, metadata: { status: input.status } });
  if (c.userId && input.public) await notifyUser(db, c.userId, { template: "complaint_update", title: `Update on your complaint ${c.ref}`, body: input.note, link: `/help/complaints/${c.id}` });
}

/* ------------------------------------------------------------ settings */

export async function getSettingsBundle() {
  const db = await getDb();
  const [cs, rates, st, cps] = await Promise.all([
    db.select().from(countries).orderBy(asc(countries.name)),
    db.select().from(exchangeRates).orderBy(desc(exchangeRates.asOf), asc(exchangeRates.quote)).limit(60),
    db.select().from(settings),
    db.select().from(coupons).orderBy(desc(coupons.createdAt)),
  ]);
  return { countries: cs, rates, settings: st, coupons: cps };
}

export async function setCountry(admin: SessionUser, code: string, patch: Partial<{ enabled: boolean; localConsultsEnabled: boolean; emergency: typeof countries.$inferSelect.emergency }>) {
  const db = await getDb();
  await db.update(countries).set({ ...patch, updatedAt: new Date() }).where(eq(countries.code, code));
  await audit({ actor: actor(admin), action: "country.update", entityType: "country", entityId: code, metadata: patch });
}

export async function addRate(admin: SessionUser, quote: string, rate: number) {
  const db = await getDb();
  const asOf = new Date().toISOString().slice(0, 10);
  await db.insert(exchangeRates).values({ base: "INR", quote, rate, asOf, source: "manual" });
  await audit({ actor: actor(admin), action: "fx.update", entityType: "exchange_rate", entityId: quote, metadata: { rate, asOf } });
}

export async function setSetting(admin: SessionUser, key: string, value: unknown) {
  const db = await getDb();
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  await audit({ actor: actor(admin), action: "settings.update", entityType: "setting", entityId: key, metadata: { value } });
}

export async function createCoupon(admin: SessionUser, c: { code: string; description: string; kind: "percent" | "flat"; value: number; maxDiscountMinor: number | null; maxUses: number | null; validUntil: Date | null; firstConsultOnly: boolean }) {
  const db = await getDb();
  const [row] = await db.insert(coupons).values({ ...c, code: c.code.toUpperCase() }).returning();
  await audit({ actor: actor(admin), action: "coupon.create", entityType: "coupon", entityId: row!.id, metadata: { code: row!.code } });
}

export async function toggleCoupon(admin: SessionUser, id: string, active: boolean) {
  const db = await getDb();
  await db.update(coupons).set({ active }).where(eq(coupons.id, id));
  await audit({ actor: actor(admin), action: active ? "coupon.activate" : "coupon.deactivate", entityType: "coupon", entityId: id });
}

/* -------------------------------------------------------- audit & DPDP */

export async function searchAudit(f: { q?: string; action?: string; patientId?: string; limit?: number }) {
  const db = await getDb();
  return db
    .select({ l: auditLogs, name: users.name })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .where(and(f.action ? ilike(auditLogs.action, `${f.action}%`) : undefined, f.patientId ? eq(auditLogs.patientId, f.patientId) : undefined, f.q ? or(ilike(users.name, `%${f.q}%`), ilike(auditLogs.entityId, `%${f.q}%`)) : undefined))
    .orderBy(desc(auditLogs.id))
    .limit(f.limit ?? 200);
}

export async function complianceBundle() {
  const db = await getDb();
  const [reqs, incidents] = await Promise.all([
    db.select({ r: dataRequests, name: users.name, email: users.email }).from(dataRequests).leftJoin(users, eq(users.id, dataRequests.userId)).orderBy(asc(dataRequests.status), asc(dataRequests.dueAt)),
    db.select().from(securityIncidents).orderBy(desc(securityIncidents.detectedAt)),
  ]);
  return { reqs, incidents };
}

export async function closeDataRequest(admin: SessionUser, id: string, status: "completed" | "rejected", note: string) {
  const db = await getDb();
  await db.update(dataRequests).set({ status, note, completedAt: new Date() }).where(eq(dataRequests.id, id));
  await audit({ actor: actor(admin), action: `data_request.${status}`, entityType: "data_request", entityId: id });
}

export async function logIncident(admin: SessionUser, i: { title: string; description: string; severity: "low" | "medium" | "high" | "critical"; affectedUsers: number }) {
  const db = await getDb();
  const [row] = await db.insert(securityIncidents).values({ ...i, detectedAt: new Date(), createdByUserId: admin.id }).returning();
  await audit({ actor: actor(admin), action: "incident.create", entityType: "security_incident", entityId: row!.id, metadata: { severity: i.severity } });
}

export async function updateIncident(admin: SessionUser, id: string, field: "containedAt" | "reportedToBoardAt" | "usersNotifiedAt" | "closed") {
  const db = await getDb();
  await db.update(securityIncidents).set(field === "closed" ? { status: "closed" } : { [field]: new Date() }).where(eq(securityIncidents.id, id));
  await audit({ actor: actor(admin), action: `incident.${field}`, entityType: "security_incident", entityId: id });
}

/* ------------------------------------------------------------- content */

export async function articleList() {
  const db = await getDb();
  const { articles } = await import("@/db/schema");
  return db
    .select({ a: articles, reviewer: doctors.fullName })
    .from(articles)
    .leftJoin(doctors, eq(doctors.id, articles.reviewedByDoctorId))
    .orderBy(desc(articles.updatedAt));
}

export async function saveArticle(admin: SessionUser, input: { id?: string; title: string; summary: string; body: string; category: string; language: string; reviewedByDoctorId: string | null; readMinutes: number; publish: boolean }) {
  const db = await getDb();
  const { articles } = await import("@/db/schema");
  const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  if (input.publish && !input.reviewedByDoctorId) throw new UserError("A doctor must review health content before it's published.");
  const values = { title: input.title, summary: input.summary, body: input.body, category: input.category, language: input.language, reviewedByDoctorId: input.reviewedByDoctorId, reviewedAt: input.reviewedByDoctorId ? new Date() : null, readMinutes: input.readMinutes, published: input.publish, publishedAt: input.publish ? new Date() : null, updatedAt: new Date() };
  const [row] = input.id
    ? await db.update(articles).set(values).where(eq(articles.id, input.id)).returning()
    : await db.insert(articles).values({ ...values, slug: `${slug}-${Date.now().toString(36).slice(-4)}` }).returning();
  await audit({ actor: actor(admin), action: input.id ? "article.update" : "article.create", entityType: "article", entityId: row!.id, metadata: { published: input.publish } });
  return row!;
}

export async function setArticlePublished(admin: SessionUser, id: string, publish: boolean) {
  const db = await getDb();
  const { articles } = await import("@/db/schema");
  const [a] = await db.select().from(articles).where(eq(articles.id, id));
  if (!a) throw new UserError("Not found");
  if (publish && !a.reviewedByDoctorId) throw new UserError("A doctor must review health content before it's published.");
  await db.update(articles).set({ published: publish, publishedAt: publish ? (a.publishedAt ?? new Date()) : a.publishedAt }).where(eq(articles.id, id));
  await audit({ actor: actor(admin), action: publish ? "article.publish" : "article.unpublish", entityType: "article", entityId: id });
}
