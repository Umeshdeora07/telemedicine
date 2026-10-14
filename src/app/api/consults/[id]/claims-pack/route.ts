import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { getSession } from "@/server/auth/session";
import { consultRecords, getAppointmentForUser } from "@/server/patient";
import { paymentForAppointment } from "@/server/booking";
import { renderInvoice } from "@/server/invoices";
import { renderPrescriptionPdf } from "@/server/prescriptions";
import { summaryPdf } from "@/lib/pdf/summary";
import { getViewerRegion } from "@/lib/prefs";
import { getDb } from "@/db";
import { brand } from "@/config/brand";
import { formatDate } from "@/lib/format";
import type { RxSnapshot } from "@/lib/rx";

/** One PDF for insurance claims: invoice, prescription and consult summary. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorised", { status: 401 });
  const { id } = await ctx.params;
  const row = await getAppointmentForUser(session.user, id);
  if (!row) return new NextResponse("Not found", { status: 404 });
  const { tz } = await getViewerRegion(session.user);
  const db = await getDb();
  const payment = await paymentForAppointment(db, id);
  const recs = await consultRecords(session.user, id);
  const out = await PDFDocument.create();
  const add = async (bytes: Buffer | null) => {
    if (!bytes) return;
    const src = await PDFDocument.load(bytes);
    for (const p of await out.copyPages(src, src.getPageIndices())) out.addPage(p);
  };
  if (payment) await add(await renderInvoice(payment.id, tz));
  for (const rx of recs.prescriptions) await add(await renderPrescriptionPdf(rx, tz));
  const reg = (recs.prescriptions[0]?.snapshot as unknown as RxSnapshot | undefined)?.doctor.registrations.map((r) => `${r.number} (${r.issuingBody})`).join("; ") ?? "";
  if (recs.note) {
    await add(
      await summaryPdf({
        title: "Consultation summary",
        brand: brand.name,
        patient: row.patientName,
        doctor: row.doctorName,
        doctorRegistration: reg,
        date: formatDate(row.a.startAt, tz),
        sections: [
          { heading: "Complaint", text: recs.note.complaint },
          { heading: recs.note.provisional ? "Provisional diagnosis" : "Diagnosis", text: recs.note.diagnosis },
          { heading: "Advice", text: recs.note.advice },
          { heading: "Investigations", text: recs.note.investigations.join(", ") },
        ],
        footer: `Booking ${row.a.ref}`,
      }),
    );
  }
  const bytes = await out.save();
  return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="claim-pack-${row.a.ref}.pdf"`, "Cache-Control": "private, no-store" } });
}
