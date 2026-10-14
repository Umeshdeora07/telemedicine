import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments } from "@/db/schema";
import { roomGuard } from "@/server/room-guard";
import { isDoctorVisible } from "@/server/doctors";
import { getCountries } from "@/server/queries/reference";
import { audit } from "@/server/audit";

/**
 * "Where are you right now?" — asked before every consult. If the patient is
 * somewhere the doctor isn't licensed, the consult can't start.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await roomGuard(id);
  if ("error" in g) return g.error;
  const { access } = g;
  if (access.role === "doctor" || access.role === "interpreter") return NextResponse.json({ ok: true });
  const body = (await req.json()) as { country: string; region?: string | null; source?: string };
  const countries = await getCountries();
  const c = countries.find((x) => x.code === body.country);
  if (!c) return NextResponse.json({ error: "Unknown country" }, { status: 400 });
  const region = c.licenceScope === "region" ? body.region ?? null : null;
  const db = await getDb();
  const allowed = await isDoctorVisible(db, access.doctor.id, { country: c.code, region });
  await audit({ actor: access.userId ? { id: access.userId, role: access.role } : null, action: "consult.location_confirmed", entityType: "appointment", entityId: id, patientId: access.appointment.patientId, metadata: { country: c.code, region, allowed, source: body.source ?? "self_declared" } }, db);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "not_licensed", place: [region, c.name].filter(Boolean).join(", ") }, { status: 409 });
  }
  await db
    .update(appointments)
    .set({ patientLocationCountry: c.code, patientLocationRegion: region, locationConfirmedAt: new Date(), locationSource: body.source === "device" ? "device" : "self_declared" })
    .where(eq(appointments.id, id));
  return NextResponse.json({ ok: true });
}
