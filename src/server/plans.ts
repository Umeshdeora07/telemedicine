import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { payments, plans, subscriptions, users } from "@/db/schema";
import { env } from "@/config/env";
import { brand } from "@/config/brand";
import { nextInvoiceNumber, BookingError } from "./booking";
import { pickGateway, stripeCreateCheckout, razorpayCreateOrder } from "./payments/gateways";
import { notifyUser } from "./notify";

/** Start buying a care plan. The subscription becomes active when payment is captured. */
export async function startPlanPurchase(userId: string, planSlug: string, patientIds: string[], careDoctorId?: string | null) {
  const db = await getDb();
  const [plan] = await db.select().from(plans).where(and(eq(plans.slug, planSlug), eq(plans.active, true)));
  if (!plan) throw new BookingError("not_found", "Plan not found");
  if (!patientIds.length || patientIds.length > plan.membersAllowed) throw new BookingError("bad_state", `Choose up to ${plan.membersAllowed} people`);
  const now = new Date();
  const [sub] = await db
    .insert(subscriptions)
    .values({ userId, planId: plan.id, patientIds, status: "pending", periodStart: now, periodEnd: new Date(now.getTime() + 30 * 86400_000), careDoctorId: careDoctorId ?? null })
    .returning();
  const gateway = pickGateway(plan.currency);
  if (gateway === "demo" && !env.demoMode) throw new BookingError("bad_state", "Online payments are not set up yet.");
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  const [payment] = await db
    .insert(payments)
    .values({
      userId,
      subscriptionId: sub!.id,
      purpose: "plan",
      gateway,
      currency: plan.currency,
      amountMinor: plan.priceMinor,
      feeMinor: plan.priceMinor,
      billing: { name: u?.name ?? "", email: u?.email ?? undefined, phone: u?.phone ?? undefined, country: u?.countryCode ?? "IN" },
    })
    .returning();
  if (gateway === "stripe") {
    const s = await stripeCreateCheckout({ paymentId: payment!.id, amountMinor: plan.priceMinor, currency: plan.currency, description: `${brand.name} ${plan.name}`, email: u?.email, successPath: "/plans?subscribed=1", cancelPath: "/pricing" });
    return { kind: "redirect" as const, url: s.url };
  }
  if (gateway === "razorpay") {
    const o = await razorpayCreateOrder({ amountMinor: plan.priceMinor, currency: plan.currency, receipt: `plan-${sub!.id.slice(0, 8)}`, notes: { payment_id: payment!.id } });
    await db.update(payments).set({ gatewayOrderId: o.id }).where(eq(payments.id, payment!.id));
    return { kind: "razorpay" as const, paymentId: payment!.id, options: { key: process.env.RAZORPAY_KEY_ID!, order_id: o.id, amount: plan.priceMinor, currency: plan.currency, name: brand.name, description: plan.name } };
  }
  return { kind: "redirect" as const, url: `/pay/${payment!.id}` };
}

export async function capturePlanPayment(paymentId: string, gatewayPaymentId: string, method: string) {
  const db = await getDb();
  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!p || p.status === "captured") return;
  await db
    .update(payments)
    .set({ status: "captured", gatewayPaymentId, method, capturedAt: new Date(), invoiceNumber: await nextInvoiceNumber(db), invoiceIssuedAt: new Date(), payoutState: "released" })
    .where(eq(payments.id, p.id));
  if (p.subscriptionId) {
    const now = new Date();
    const [sub] = await db
      .update(subscriptions)
      .set({ status: "active", periodStart: now, periodEnd: new Date(now.getTime() + 30 * 86400_000), nextCheckInAt: new Date(now.getTime() + 28 * 86400_000) })
      .where(eq(subscriptions.id, p.subscriptionId))
      .returning();
    const [plan] = await db.select().from(plans).where(eq(plans.id, sub!.planId));
    await notifyUser(db, p.userId, { template: "plan_active", title: `${plan?.name ?? "Plan"} is active`, body: "Thank you! Your care plan is active for the next 30 days.", link: "/plans" });
  }
}
