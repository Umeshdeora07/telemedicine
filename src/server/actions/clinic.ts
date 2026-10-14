"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { checkIn, CheckInError, recordDeskPayment } from "@/server/clinic-portal";
import { staffClinicIds } from "@/server/cases";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { availabilitySlots } from "@/db/schema";
import { audit } from "@/server/audit";

export type CheckInState = { ok?: boolean; already?: boolean; apptId?: string; ref?: string; error?: string };

export async function checkInAction(input: { token?: string; code?: string }): Promise<CheckInState> {
  const t = await getT();
  const user = await requireUser({ roles: ["clinic_coordinator"] });
  const v = z.object({ token: z.string().max(400).optional(), code: z.string().max(20).optional() }).parse(input);
  if (!v.token && !v.code) return { error: t("Scan the QR code or type the code from the visit pass.") };
  try {
    const r = await checkIn(user, await staffClinicIds(user.id), v);
    revalidatePath("/clinic");
    return { ok: true, already: r.already, apptId: r.appt.id, ref: r.appt.ref };
  } catch (e) {
    if (e instanceof CheckInError) return { error: t(e.message) };
    throw e;
  }
}

export async function deskPaymentAction(apptId: string, method: "cash" | "upi" | "card") {
  const t = await getT();
  const user = await requireUser({ roles: ["clinic_coordinator"] });
  try {
    const p = await recordDeskPayment(user, await staffClinicIds(user.id), apptId, z.enum(["cash", "upi", "card"]).parse(method));
    revalidatePath(`/clinic/visits/${apptId}`);
    return { ok: true as const, invoice: p.invoiceNumber, paymentId: p.id };
  } catch (e) {
    if (e instanceof CheckInError) return { ok: false as const, error: t(e.message) };
    throw e;
  }
}

/** Reception can close or reopen in-clinic slots at their clinic (doctor on leave, room unavailable). */
export async function clinicToggleSlotAction(slotId: string, block: boolean) {
  const user = await requireUser({ roles: ["clinic_coordinator"] });
  const ids = await staffClinicIds(user.id);
  if (!ids.length) return;
  const db = await getDb();
  const [s] = await db
    .update(availabilitySlots)
    .set({ status: block ? "blocked" : "open" })
    .where(and(eq(availabilitySlots.id, slotId), inArray(availabilitySlots.clinicId, ids), inArray(availabilitySlots.status, block ? ["open"] : ["blocked"])))
    .returning();
  if (s) await audit({ actor: { id: user.id, role: user.role }, action: block ? "slot.block" : "slot.open", entityType: "slot", entityId: s.id, metadata: { doctorId: s.doctorId } });
  revalidatePath("/clinic/doctors");
}
