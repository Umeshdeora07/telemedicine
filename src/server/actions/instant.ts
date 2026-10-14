"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { getViewerRegion } from "@/lib/prefs";
import { requireUser } from "@/server/auth/session";
import { getCountries } from "@/server/queries/reference";
import { findInstantDoctor } from "@/server/instant";
import { BookingError, createDraftAppointment } from "@/server/booking";
import { setLocationAction } from "./prefs";

export type InstantState = { error?: string; none?: boolean };

const schema = z.object({
  specialty: z.string().min(1),
  patientId: z.string().uuid(),
  country: z.string().regex(/^[A-Z]{2}$/),
  region: z.string().optional(),
  language: z.string().max(5).optional(),
  gender: z.enum(["female", "male", ""]).optional(),
  mode: z.enum(["video", "audio", "chat"]),
  caregiverConsent: z.literal("on").optional(),
});

export async function startInstantConsult(_prev: InstantState, form: FormData): Promise<InstantState> {
  const t = await getT();
  const user = await requireUser();
  const flags = form.getAll("redFlags").map(String);
  const parsed = schema.safeParse(Object.fromEntries([...form.entries()].filter(([k]) => k !== "redFlags")));
  if (!parsed.success) return { error: t("Please choose who the consult is for and where they are.") };
  const v = parsed.data;
  if (flags.length) redirect(`/emergency?flags=${flags.join(",")}&from=booking&for=${v.country}`);
  const c = (await getCountries()).find((x) => x.code === v.country);
  const region = c?.licenceScope === "region" ? v.region || null : null;
  if (c?.licenceScope === "region" && !region) return { error: t("Please choose the state or province the patient is in.") };
  const loc = { country: v.country, region };
  const match = await findInstantDoctor(loc, v.specialty, { language: v.language || undefined, gender: (v.gender || undefined) as "female" | "male" | undefined });
  if (!match) return { error: t("No doctor can consult a patient in that location yet."), none: true };
  if (!match.doctor) return { error: t("All doctors in this specialty are busy right now. Please book the next available slot."), none: true };
  const { currency, tz } = await getViewerRegion(user);
  let id: string;
  try {
    const appt = await createDraftAppointment({
      userId: user.id,
      doctorId: match.doctor.id,
      mode: match.doctor.modes.includes(v.mode) ? v.mode : "video",
      slotId: match.slot?.id ?? null,
      patientId: v.patientId,
      location: loc,
      currency,
      patientTimeZone: c?.timeZones.length === 1 ? c.timeZones[0]! : tz,
      redFlags: [],
      caregiverConfirmedConsent: v.caregiverConsent === "on",
    });
    id = appt.id;
  } catch (e) {
    if (e instanceof BookingError) return { error: t(e.message) };
    throw e;
  }
  await setLocationAction(v.country, region);
  redirect(`/book/review/${id}`);
}
