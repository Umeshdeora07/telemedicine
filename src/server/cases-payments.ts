import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { caseEvents, internationalCases, payments, users } from "@/db/schema";
import { env } from "@/config/env";
import { brand } from "@/config/brand";
import { BookingError, nextInvoiceNumber } from "./booking";
import { pickGateway, stripeCreateCheckout, razorpayCreateOrder } from "./payments/gateways";

/** Deposit or final bill for a treatment-in-India case, in the patient's currency. */
export async function startCasePayment(caseId: string, userId: string, kind: "case_deposit" | "case_final", amountMinor: number, currency: string) {
  const db = await getDb();
  const [c] = await db.select().from(internationalCases).where(eq(internationalCases.id, caseId));
  if (!c) throw new BookingError("not_found", "Case not found");
  const gateway = pickGateway(currency);
  if (gateway === "demo" && !env.demoMode) throw new BookingError("bad_state", "Online payments are not set up yet.");
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  const [payment] = await db
    .insert(payments)
    .values({ userId, patientId: c.patientId, caseId, purpose: kind, gateway, currency, amountMinor, feeMinor: amountMinor, billing: { name: u?.name ?? "", email: u?.email ?? undefined, country: u?.countryCode ?? c.homeCountry } })
    .returning();
  const label = kind === "case_deposit" ? "Treatment deposit" : "Final hospital bill";
  if (gateway === "stripe") {
    const s = await stripeCreateCheckout({ paymentId: payment!.id, amountMinor, currency, description: `${brand.name}: ${label} (${c.ref})`, email: u?.email, successPath: `/international/cases/${caseId}?paid=1`, cancelPath: `/international/cases/${caseId}` });
    return { kind: "redirect" as const, url: s.url };
  }
  if (gateway === "razorpay") {
    const o = await razorpayCreateOrder({ amountMinor, currency, receipt: c.ref, notes: { payment_id: payment!.id } });
    await db.update(payments).set({ gatewayOrderId: o.id }).where(eq(payments.id, payment!.id));
    return { kind: "razorpay" as const, paymentId: payment!.id, options: { key: process.env.RAZORPAY_KEY_ID!, order_id: o.id, amount: amountMinor, currency, name: brand.name, description: label } };
  }
  return { kind: "redirect" as const, url: `/pay/${payment!.id}` };
}

export async function captureCasePayment(paymentId: string, gatewayPaymentId: string, method: string) {
  const db = await getDb();
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!p || p.status === "captured" || !p.caseId) return;
  await db
    .update(payments)
    .set({ status: "captured", gatewayPaymentId, method, capturedAt: new Date(), invoiceNumber: await nextInvoiceNumber(db), invoiceIssuedAt: new Date() })
    .where(eq(payments.id, p.id));
  await db.insert(caseEvents).values({
    caseId: p.caseId,
    note: p.purpose === "case_deposit" ? "Deposit received. Thank you. Your receipt is in your treatment plan." : "Final bill paid. Receipts for insurance are in your records.",
    actorRole: "system",
  });
}
