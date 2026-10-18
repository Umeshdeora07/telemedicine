import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appointments, doctors, documents, payments } from "@/db/schema";
import { getSession } from "@/server/auth/session";
import { readFileIfPresent } from "@/lib/storage";

/** The doctor's UPI QR code, for the patient paying this booking only. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("Not found", { status: 404 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Not found", { status: 404 });
  const db = await getDb();
  const [row] = await db
    .select({ details: doctors.paymentDetails, doctorId: doctors.id })
    .from(payments)
    .innerJoin(appointments, eq(appointments.id, payments.appointmentId))
    .innerJoin(doctors, eq(doctors.id, appointments.doctorId))
    .where(and(eq(payments.id, id), eq(payments.userId, session.user.id), eq(payments.gateway, "direct")));
  const docId = row?.details?.qrDocumentId;
  if (!docId) return new NextResponse("Not found", { status: 404 });
  const [doc] = await db.select().from(documents).where(and(eq(documents.id, docId), eq(documents.doctorId, row.doctorId)));
  if (!doc) return new NextResponse("Not found", { status: 404 });
  const data = await readFileIfPresent(doc.storageKey);
  if (!data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": doc.mimeType, "Content-Length": String(data.length), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
