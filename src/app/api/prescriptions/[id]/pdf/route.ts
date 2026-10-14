import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import { getPrescriptionForUser, renderPrescriptionPdf } from "@/server/prescriptions";
import { getViewerRegion } from "@/lib/prefs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url));
  const { id } = await ctx.params;
  const rx = await getPrescriptionForUser(session.user, id);
  if (!rx) return new NextResponse("Not found", { status: 404 });
  const { tz } = await getViewerRegion(session.user);
  const pdf = await renderPrescriptionPdf(rx, tz);
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${rx.number}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
