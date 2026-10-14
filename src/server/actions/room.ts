"use server";

import { getT } from "@/i18n/server";
import { createInvite, getRoomAccess } from "@/server/room";
import { audit } from "@/server/audit";

export async function createInviteAction(apptId: string, role: "caregiver" | "interpreter", name: string) {
  const t = await getT();
  const access = await getRoomAccess(apptId);
  if (!access || !access.userId || access.role === "interpreter") return { ok: false as const, error: t("You can't invite people to this consult.") };
  if (!["confirmed", "in_progress"].includes(access.appointment.status)) return { ok: false as const, error: t("This consult isn't active.") };
  const url = await createInvite(apptId, access.userId, role === "interpreter" ? "interpreter" : "caregiver", name.trim() || (role === "interpreter" ? "Interpreter" : "Family member"));
  await audit({ actor: { id: access.userId, role: access.role }, action: "room.invite", entityType: "appointment", entityId: apptId, patientId: access.appointment.patientId, metadata: { role } });
  return { ok: true as const, url };
}
