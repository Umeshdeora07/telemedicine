"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { assignInterpreter, assistedBooking, updateCallback } from "@/server/coordinator";
import { BookingError } from "@/server/booking";
import { publicMessage } from "@/lib/errors";

const COORD = { roles: ["care_coordinator", "super_admin"] as ("care_coordinator" | "super_admin")[] };

export async function callbackAction(id: string, status: "open" | "in_progress" | "done", outcome?: string) {
  const user = await requireUser(COORD);
  await updateCallback(user, z.string().uuid().parse(id), { status: z.enum(["open", "in_progress", "done"]).parse(status), outcome, assignToMe: status === "in_progress" });
  revalidatePath("/coordinator/callbacks");
  revalidatePath("/coordinator");
}

export type AssistState = { ok?: boolean; error?: string; apptId?: string; ref?: string };

export async function assistedBookingAction(_prev: AssistState, form: FormData): Promise<AssistState> {
  const t = await getT();
  const user = await requireUser(COORD);
  const v = z
    .object({
      patientId: z.string().uuid(),
      doctorId: z.string().uuid(),
      mode: z.enum(["video", "audio", "chat", "in_clinic"]),
      slotId: z.string().uuid(),
      interpreterLanguage: z.string().max(10).optional(),
      agreed: z.literal("on"),
    })
    .safeParse(Object.fromEntries(form));
  if (!v.success) return { error: t("Choose a time and confirm the patient asked for this booking.") };
  try {
    const a = await assistedBooking(user, { ...v.data, interpreterLanguage: v.data.interpreterLanguage || null, patientAgreed: true });
    revalidatePath("/coordinator");
    return { ok: true, apptId: a.id, ref: a.ref };
  } catch (e) {
    if (e instanceof BookingError) return { error: t(e.message) };
    return { error: t(publicMessage(e, "Something went wrong. Please try another time slot.")) };
  }
}

export async function assignInterpreterAction(apptId: string, interpreterId: string) {
  const user = await requireUser(COORD);
  const r = await assignInterpreter(user, z.string().uuid().parse(apptId), z.string().uuid().parse(interpreterId));
  revalidatePath("/coordinator/interpreters");
  return { url: r.url, name: r.interpreter.name };
}
