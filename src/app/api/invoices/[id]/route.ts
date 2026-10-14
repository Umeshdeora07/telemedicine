import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { getSession } from "@/server/auth/session";
import { canActForPatient } from "@/server/booking";
import { renderInvoice } from "@/server/invoices";
import { getViewerRegion } from "@/lib/prefs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorised", { status: 401 });
  const { id } = await ctx.params;
  const db = await getDb();
  const [p] = await db.select().from(payments).where(eq(payments.id, id));
  if (!p) return new NextResponse("Not found", { status: 404 });
  const allowed = p.userId === session.user.id || session.user.role === "super_admin" || (p.patientId ? (await canActForPatient(db, session.user.id, p.patientId, "records")).ok : false);
  if (!allowed) return new NextResponse("Not found", { status: 404 });
  const { tz } = await getViewerRegion(session.user);
  const pdf = await renderInvoice(p.id, tz);
  if (!pdf) return new NextResponse("No invoice", { status: 404 });
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${p.invoiceNumber!.replace(/\//g, "-")}.pdf"`, "Cache-Control": "private, no-store" } });
}
