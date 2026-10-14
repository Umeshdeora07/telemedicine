"use server";

import { publicMessage } from "@/lib/errors";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { appointments, doctors } from "@/db/schema";
import type { TriageResult } from "@/db/schema";
import { getT } from "@/i18n/server";
import { getViewerRegion } from "@/lib/prefs";
import { decodeTriage } from "@/lib/triage";
import { requireUser } from "@/server/auth/session";
import { getCountries } from "@/server/queries/reference";
import { applyCoupon, BookingError, cancelAppointment, createDraftAppointment, removeCoupon, rescheduleAppointment, startAppointmentPayment } from "@/server/booking";
import { setLocationAction } from "./prefs";

export type BookingFormState = { error?: string; code?: string };

const schema = z.object({
  doctorSlug: z.string().min(1),
  mode: z.enum(["video", "audio", "chat", "in_clinic"]),
  slotId: z.string().uuid().optional().or(z.literal("")),
  patientId: z.string().uuid(),
  country: z.string().regex(/^[A-Z]{2}$/),
  region: z.string().optional(),
  interpreter: z.string().max(5).optional(),
  caregiverConsent: z.literal("on").optional(),
  from: z.string().uuid().optional().or(z.literal("")),
  type: z.enum(["first", "follow_up"]).optional().or(z.literal("")),
});

export async function createBookingAction(_prev: BookingFormState, form: FormData): Promise<BookingFormState> {
  const t = await getT();
  const user = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries([...form.entries()].filter(([k]) => k !== "redFlags")));
  if (!parsed.success) return { error: t("Please choose who the consult is for and where they are.") };
  const v = parsed.data;
  const redFlags = form.getAll("redFlags").map(String);
  if (redFlags.length) redirect(`/emergency?flags=${redFlags.join(",")}&from=booking&for=${v.country}`);

  const db = await getDb();
  const [doctor] = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.slug, v.doctorSlug));
  if (!doctor) return { error: t("Doctor not found.") };
  const countries = await getCountries();
  const country = countries.find((c) => c.code === v.country);
  if (v.mode !== "in_clinic" && country?.licenceScope === "region" && !v.region) return { error: t("Please choose the state or province the patient is in."), code: "needs_region" };
  const region = country?.licenceScope === "region" ? (v.region ?? null) : null;
  const { currency, tz } = await getViewerRegion(user);
  const patientTz = country?.timeZones.length === 1 ? country.timeZones[0]! : tz;

  // Answers from the symptom checker travel with the booking so the doctor sees them.
  const triageCookie = (await cookies()).get("triage")?.value;
  const triage = decodeTriage<TriageResult & { answers: Record<string, unknown> }>(triageCookie);

  let apptId: string;
  try {
    const appt = await createDraftAppointment({
      userId: user.id,
      doctorId: doctor.id,
      mode: v.mode,
      slotId: v.slotId || null,
      patientId: v.patientId,
      location: { country: v.country, region },
      currency,
      patientTimeZone: patientTz,
      consultType: v.type || undefined,
      interpreterLanguage: v.interpreter || null,
      redFlags: [],
      parentAppointmentId: null,
      actionId: v.from || null,
      caregiverConfirmedConsent: v.caregiverConsent === "on",
    });
    apptId = appt.id;
    if (triage) await db.update(appointments).set({ triage: { ...triage, answers: triage.answers as TriageResult["answers"] } }).where(eq(appointments.id, appt.id));
  } catch (e) {
    if (e instanceof BookingError) {
      const messages: Record<string, string> = {
        slot_taken: t("Sorry, someone just booked that time. Please go back and pick another slot."),
        not_licensed: t("This doctor isn't licensed to treat a patient in that location. Choose another doctor, or check the patient's location."),
        consent_pending: t("This family member hasn't confirmed that you can book for them yet. Ask them to confirm from the Family page."),
        not_allowed: t("You can't book for this person."),
        mode_unavailable: t("This doctor doesn't offer that type of consult."),
      };
      return { error: messages[e.code] ?? t(e.message), code: e.code };
    }
    throw e;
  }
  if (v.mode !== "in_clinic") await setLocationAction(v.country, region);
  redirect(`/book/review/${apptId}`);
}

export async function applyCouponAction(apptId: string, code: string) {
  const t = await getT();
  const user = await requireUser();
  const r = await applyCoupon(apptId, user.id, code);
  return r.ok ? { ok: true as const } : { ok: false as const, error: t(r.error) };
}

export async function removeCouponAction(apptId: string) {
  const user = await requireUser();
  await removeCoupon(apptId, user.id);
}

export async function payAction(apptId: string, method: string) {
  const user = await requireUser();
  try {
    const r = await startAppointmentPayment(apptId, user.id, method);
    if (r.kind === "done") return { kind: "redirect" as const, url: `/book/done/${apptId}` };
    return r;
  } catch (e) {
    if (e instanceof BookingError) return { kind: "error" as const, error: e.message };
    throw e;
  }
}

export async function cancelBookingAction(apptId: string, reason: string) {
  const t = await getT();
  const user = await requireUser();
  const db = await getDb();
  const [appt] = await db.select().from(appointments).where(and(eq(appointments.id, apptId), eq(appointments.bookedByUserId, user.id)));
  if (!appt) return { ok: false as const, error: t("Booking not found.") };
  try {
    const r = await cancelAppointment(apptId, { userId: user.id, role: "patient" }, reason || "Cancelled by patient");
    return { ok: true as const, refunded: r.refunded };
  } catch (e) {
    return { ok: false as const, error: t(publicMessage(e)) };
  }
}

export async function rescheduleAction(apptId: string, slotId: string) {
  const t = await getT();
  const user = await requireUser();
  try {
    await rescheduleAppointment(apptId, user.id, slotId);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: t(publicMessage(e)) };
  }
}
