"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { appointments, doctors, partnerOrders, prescriptionItems, reviews } from "@/db/schema";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { canActForPatient } from "@/server/booking";
import { getPrescriptionForUser } from "@/server/prescriptions";
import { audit } from "@/server/audit";
import { withRls } from "@/db";

/** Honest reviews: only for a completed consult, once, by the person who booked or the patient. */
export async function submitReviewAction(apptId: string, rating: number, text: string, tags: string[]) {
  const t = await getT();
  const user = await requireUser();
  const db = await getDb();
  const [a] = await db.select().from(appointments).where(eq(appointments.id, apptId));
  if (!a || a.status !== "completed") return { ok: false as const, error: t("You can review only after a completed consult.") };
  if (!(await canActForPatient(db, user.id, a.patientId, "join")).ok) return { ok: false as const, error: t("You can't review this consult.") };
  const v = z.object({ rating: z.number().int().min(1).max(5), text: z.string().max(1500), tags: z.array(z.string().max(40)).max(6) }).safeParse({ rating, text, tags });
  if (!v.success) return { ok: false as const, error: t("Please choose 1 to 5 stars.") };
  const name = user.name.split(" ");
  await db
    .insert(reviews)
    .values({ appointmentId: a.id, doctorId: a.doctorId, patientId: a.patientId, authorUserId: user.id, authorDisplayName: `${name[0]} ${name[1]?.[0] ?? ""}.`.trim(), rating: v.data.rating, text: v.data.text.trim(), tags: v.data.tags })
    .onConflictDoNothing();
  await db.execute(sql`
    update doctors d set
      rating_avg = coalesce((select round(avg(rating)::numeric, 2) from reviews r where r.doctor_id = d.id and r.status = 'published'), 0),
      rating_count = (select count(*) from reviews r where r.doctor_id = d.id and r.status = 'published')
    where d.id = ${a.doctorId}
  `);
  revalidatePath(`/consults/${apptId}`);
  return { ok: true as const };
}

/** One tap to order medicines or book lab tests with a partner (demo partner integration). */
export async function partnerOrderAction(apptId: string, kind: "pharmacy" | "lab", prescriptionId: string | null, address: string) {
  const t = await getT();
  const user = await requireUser();
  const db = await getDb();
  const [a] = await db.select().from(appointments).where(eq(appointments.id, apptId));
  if (!a || !(await canActForPatient(db, user.id, a.patientId, "book")).ok) return { ok: false as const, error: t("Not allowed.") };
  let items: { name: string; qty?: string }[] = [];
  if (kind === "pharmacy" && prescriptionId) {
    const rx = await getPrescriptionForUser(user, prescriptionId);
    if (!rx) return { ok: false as const, error: t("Prescription not found.") };
    const its = await withRls({ userId: user.id, role: user.role }, (tx) => tx.select().from(prescriptionItems).where(eq(prescriptionItems.prescriptionId, rx.id)));
    items = its.map((i) => ({ name: `${i.name} ${i.strength}`.trim(), qty: `${i.durationDays} days` }));
  } else if (kind === "lab") {
    const { consultRecords } = await import("@/server/patient");
    const r = await consultRecords(user, apptId);
    items = (r.note?.investigations ?? []).map((n) => ({ name: n }));
  }
  if (!items.length) return { ok: false as const, error: t("Nothing to order.") };
  const [o] = await db
    .insert(partnerOrders)
    .values({ kind, partner: kind === "pharmacy" ? "Partner pharmacy" : "Partner lab", patientId: a.patientId, userId: user.id, prescriptionId, appointmentId: a.id, items, address: address.slice(0, 300), externalRef: `DEMO-${Date.now().toString(36).toUpperCase()}` })
    .returning();
  await audit({ actor: { id: user.id, role: user.role }, action: `partner_order.${kind}`, entityType: "partner_order", entityId: o!.id, patientId: a.patientId });
  revalidatePath(`/consults/${apptId}`);
  return { ok: true as const, ref: o!.externalRef };
}

export async function doctorReplyAction(reviewId: string, reply: string) {
  const user = await requireUser({ roles: ["doctor"] });
  const db = await getDb();
  const [d] = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, user.id));
  if (!d) return { ok: false as const };
  await db.update(reviews).set({ doctorReply: reply.trim().slice(0, 1000), repliedAt: new Date() }).where(and(eq(reviews.id, reviewId), eq(reviews.doctorId, d.id)));
  revalidatePath("/doctor/reviews");
  return { ok: true as const };
}
