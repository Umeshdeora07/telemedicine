import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, clinics, doctors } from "@/db/schema";
import { getSession } from "@/server/auth/session";
import { canActForPatient } from "@/server/booking";
import { brand } from "@/config/brand";
import { env } from "@/config/env";

const ics = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/[\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

/** Add-to-calendar file. Contains no medical details. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorised", { status: 401 });
  const { id } = await ctx.params;
  const db = await getDb();
  const [a] = await db.select({ a: appointments, d: doctors }).from(appointments).innerJoin(doctors, eq(doctors.id, appointments.doctorId)).where(eq(appointments.id, id));
  if (!a || !(await canActForPatient(db, session.user.id, a.a.patientId, "join")).ok) return new NextResponse("Not found", { status: 404 });
  const [c] = a.a.clinicId ? await db.select().from(clinics).where(eq(clinics.id, a.a.clinicId)) : [];
  const title = a.a.mode === "in_clinic" ? `Clinic visit: ${a.d.fullName}` : `${brand.name} consult: ${a.d.fullName}`;
  const url = a.a.mode === "in_clinic" ? `${env.appUrl}/consults/${a.a.id}/pass` : `${env.appUrl}/consult/${a.a.id}`;
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${brand.name}//Consults//EN`,
    "BEGIN:VEVENT",
    `UID:${a.a.id}@${new URL(env.appUrl).host}`,
    `DTSTAMP:${ics(new Date())}`,
    `DTSTART:${ics(a.a.startAt)}`,
    `DTEND:${ics(a.a.endAt)}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(`Booking ${a.a.ref}. Join or view: ${url}`)}`,
    c ? `LOCATION:${esc(`${c.name}, ${c.addressLine}, ${c.city}`)}` : `LOCATION:${esc(url)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new NextResponse(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${a.a.ref}.ics"` } });
}
