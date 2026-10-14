"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getT, getLocale } from "@/i18n/server";
import { getUser, requireSession } from "@/server/auth/session";
import { createCallback, createComplaint } from "@/server/support";
import { getDb } from "@/db";
import { appointments, doctors, specialties, users } from "@/db/schema";
import { audit } from "@/server/audit";
import { slugify } from "@/lib/utils";

export type SupportState = { ok?: boolean; error?: string; ref?: string; id?: string };

export async function callbackAction(_p: SupportState, f: FormData): Promise<SupportState> {
  const t = await getT();
  const user = await getUser();
  const v = z
    .object({ name: z.string().min(2).max(100), phone: z.string().regex(/^\+?[\d\s-]{8,18}$/), reason: z.enum(["booking_help", "payment", "technical", "international", "partnership", "other"]), note: z.string().max(1000).optional(), preferredTime: z.string().max(100).optional(), language: z.string().max(5).optional() })
    .safeParse(Object.fromEntries(f));
  if (!v.success) return { error: t("Please give your name and a phone number we can call.") };
  await createCallback({ userId: user?.id ?? null, name: v.data.name, phone: v.data.phone.replace(/[\s-]/g, ""), language: v.data.language || (await getLocale()), reason: v.data.reason, note: v.data.note ?? "", preferredTime: v.data.preferredTime ?? "" });
  return { ok: true };
}

export async function complaintAction(_p: SupportState, f: FormData): Promise<SupportState> {
  const t = await getT();
  const user = await getUser();
  const v = z
    .object({ name: z.string().min(2).max(100), contact: z.string().min(5).max(120), category: z.enum(["consult", "doctor", "payment", "refund", "privacy", "technical", "other"]), subject: z.string().min(5).max(160), description: z.string().min(20).max(5000), appointmentRef: z.string().max(20).optional() })
    .safeParse(Object.fromEntries(f));
  if (!v.success) return { error: t("Please fill your name, a phone or email, a subject and describe what happened (a few sentences).") };
  const c = await createComplaint({ userId: user?.id ?? null, ...v.data, appointmentRef: v.data.appointmentRef || null });
  return { ok: true, ref: c.ref, id: c.id };
}

/** A signed-in person applies to join as a doctor. Their account becomes a doctor account in draft. */
export async function applyAsDoctorAction(_p: SupportState, f: FormData): Promise<SupportState> {
  const t = await getT();
  const session = await requireSession({ allowNotOnboarded: true, allowWithoutMfa: true });
  const user = session.user;
  if (user.role === "doctor") redirect("/doctor/onboarding");
  if (user.role !== "patient") return { error: t("This account is a staff account. Use a separate account to apply.") };
  const v = z.object({ fullName: z.string().min(3).max(100), specialty: z.string().min(2), gender: z.enum(["female", "male", "other"]), agree: z.literal("on") }).safeParse(Object.fromEntries(f));
  if (!v.success) return { error: t("Please fill your name, specialty and agree to verification.") };
  const db = await getDb();
  const [booked] = await db.select({ id: appointments.id }).from(appointments).where(eq(appointments.bookedByUserId, user.id)).limit(1);
  if (booked) return { error: t("This account has patient bookings. Please apply with your work email instead, so your patient and doctor records stay separate.") };
  const [spec] = await db.select().from(specialties).where(eq(specialties.slug, v.data.specialty));
  if (!spec) return { error: t("Choose a specialty.") };
  const base = slugify(v.data.fullName.startsWith("Dr") ? v.data.fullName : `Dr ${v.data.fullName}`);
  await db.insert(doctors).values({ userId: user.id, slug: `${base}-${user.id.slice(0, 6)}`, fullName: v.data.fullName.startsWith("Dr") ? v.data.fullName : `Dr. ${v.data.fullName}`, gender: v.data.gender === "other" ? "female" : v.data.gender, specialtyId: spec.id, verificationStatus: "draft", avatarSeed: Math.floor(Math.random() * 1000) });
  await db.update(users).set({ role: "doctor", name: v.data.fullName, onboarded: true }).where(eq(users.id, user.id));
  await audit({ actor: { id: user.id, role: "doctor" }, action: "doctor.apply", entityType: "user", entityId: user.id });
  // Doctors must set up two-step sign-in before they see the portal.
  redirect("/mfa?next=/doctor/onboarding");
}
