import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { payments, appointments, doctors } from "@/db/schema";
import { invoicePdf } from "@/lib/pdf/invoice";
import { env } from "@/config/env";

const PURPOSE: Record<string, string> = {
  consult: "Online consultation",
  clinic_visit: "Clinic consultation",
  plan: "Care plan subscription (1 month)",
  case_deposit: "Treatment deposit (on behalf of the hospital)",
  case_final: "Hospital bill (on behalf of the hospital)",
  second_opinion: "Written second opinion",
};

export async function renderInvoice(paymentId: string, timeZone: string) {
  const db = await getDb();
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!p || !p.invoiceNumber) return null;
  const [a] = p.appointmentId ? await db.select({ ref: appointments.ref, doctorName: doctors.fullName }).from(appointments).innerJoin(doctors, eq(doctors.id, appointments.doctorId)).where(eq(appointments.id, p.appointmentId)) : [];
  const lines = [{ description: `${PURPOSE[p.purpose] ?? p.purpose}${a ? `, ${a.doctorName} (${a.ref})` : ""}`, sac: "999312", amountMinor: p.feeMinor }];
  if (p.platformFeeMinor) lines.push({ description: "Platform and booking fee", sac: "998599", amountMinor: p.platformFeeMinor });
  return invoicePdf({
    number: p.invoiceNumber,
    issuedAt: p.invoiceIssuedAt ?? p.createdAt,
    currency: p.currency,
    billing: p.billing ?? { name: "", country: "IN" },
    placeOfSupply: p.currency === "INR" ? (p.billing?.state ?? env.platformState) : `Outside India (${p.billing?.country ?? "-"})`,
    lines,
    taxLines: p.taxLines,
    totalMinor: p.amountMinor,
    refundedMinor: p.refundedMinor,
    paymentRef: p.gatewayPaymentId ?? p.id.slice(0, 8),
    method: p.method,
    fx: p.fxRate ? { rate: p.fxRate, asOf: p.fxAsOf } : null,
    timeZone,
  });
}
