import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { callbackRequests, complaints, users } from "@/db/schema";
import { brand } from "@/config/brand";
import { refs } from "@/lib/ids";
import { notifyUser } from "@/server/notify";
import { audit } from "@/server/audit";

export async function createCallback(input: { userId: string | null; name: string; phone: string; language: string; reason: string; note: string; preferredTime: string }) {
  const db = await getDb();
  const [r] = await db.insert(callbackRequests).values({ ...input, note: input.note || null, preferredTime: input.preferredTime || null }).returning();
  const coords = await db.select({ id: users.id }).from(users).where(eq(users.role, "care_coordinator"));
  for (const c of coords) await notifyUser(db, c.id, { template: "callback_new", title: `Callback: ${input.name}`, body: `${input.reason.replace(/_/g, " ")} · ${input.phone}`, link: "/coordinator/callbacks", channels: ["in_app"] });
  await audit({ actor: input.userId ? { id: input.userId, role: "patient" } : null, action: "callback.create", entityType: "callback", entityId: r!.id });
  return r!;
}

/** Grievance: acknowledged within 24 hours, resolved within 15 days (published SLA). */
export async function createComplaint(input: { userId: string | null; name: string; contact: string; category: string; subject: string; description: string; appointmentRef: string | null }) {
  const db = await getDb();
  const now = Date.now();
  let appointmentId: string | null = null;
  if (input.appointmentRef) {
    const { appointments } = await import("@/db/schema");
    const [a] = await db.select({ id: appointments.id }).from(appointments).where(eq(appointments.ref, input.appointmentRef.trim().toUpperCase()));
    appointmentId = a?.id ?? null;
  }
  const [c] = await db
    .insert(complaints)
    .values({
      ref: refs.complaint(),
      userId: input.userId,
      name: input.name,
      contact: input.contact,
      appointmentId,
      category: input.category,
      subject: input.subject,
      description: input.description,
      acknowledgeBy: new Date(now + brand.grievanceSla.acknowledgeHours * 3600_000),
      resolveBy: new Date(now + brand.grievanceSla.resolveDays * 86400_000),
    })
    .returning();
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "super_admin"));
  for (const a of admins) await notifyUser(db, a.id, { template: "complaint_new", title: `New complaint ${c!.ref}`, body: input.subject, link: "/admin/complaints", channels: ["in_app", "email"] });
  if (input.userId) await notifyUser(db, input.userId, { template: "complaint_received", title: `We received your complaint ${c!.ref}`, body: `We'll reply within ${brand.grievanceSla.acknowledgeHours} hours and resolve it within ${brand.grievanceSla.resolveDays} days.`, link: `/help/complaints/${c!.id}` });
  await audit({ actor: input.userId ? { id: input.userId, role: "patient" } : null, action: "complaint.create", entityType: "complaint", entityId: c!.id });
  return c!;
}

/** Look up a complaint by its reference and the contact used to file it (no login needed). */
export async function complaintByRef(ref: string, contact: string) {
  const db = await getDb();
  const [c] = await db.select().from(complaints).where(and(eq(complaints.ref, ref.trim().toUpperCase()), sql`lower(${complaints.contact}) = ${contact.trim().toLowerCase()}`));
  return c ?? null;
}

export async function complaintForUser(id: string, userId: string) {
  const db = await getDb();
  const [c] = await db.select().from(complaints).where(and(eq(complaints.id, id), eq(complaints.userId, userId)));
  return c ?? null;
}
