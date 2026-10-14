/**
 * Payment gateways. We never see or store card details: patients pay on the
 * gateway's PCI-DSS compliant page or widget.
 *   - Razorpay (India: UPI, cards, net banking, wallets) — RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET
 *   - Stripe Checkout (international cards and wallets) — STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
 *   - Demo (test page, no money moves) when neither is configured
 */
import crypto from "node:crypto";
import { env } from "@/config/env";

export type GatewayName = "demo" | "razorpay" | "stripe";

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}
export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function pickGateway(currency: string): GatewayName {
  if (currency === "INR" && razorpayConfigured()) return "razorpay";
  if (currency !== "INR" && stripeConfigured()) return "stripe";
  if (stripeConfigured() && !razorpayConfigured()) return "stripe";
  return "demo";
}

export const METHODS_BY_CURRENCY = (currency: string) =>
  currency === "INR" ? (["upi", "card", "netbanking", "wallet"] as const) : (["intl_card", "wallet"] as const);

/* ------------------------------------------------------------- Razorpay */

const rzpAuth = () => "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");

export async function razorpayCreateOrder(p: { amountMinor: number; currency: string; receipt: string; notes: Record<string, string> }) {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: rzpAuth(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: p.amountMinor, currency: p.currency, receipt: p.receipt.slice(0, 40), notes: p.notes, payment_capture: 1 }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { id: string };
}

export function razorpayVerifySignature(orderId: string, paymentId: string, signature: string) {
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex");
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function razorpayVerifyWebhook(body: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function razorpayRefund(paymentId: string, amountMinor: number, notes: Record<string, string>) {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: "POST",
    headers: { Authorization: rzpAuth(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountMinor, speed: "normal", notes }),
  });
  if (!res.ok) throw new Error(`Razorpay refund failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

/* --------------------------------------------------------------- Stripe */

async function stripe(path: string, params: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!res.ok) throw new Error(`Stripe ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function stripeCreateCheckout(p: { paymentId: string; amountMinor: number; currency: string; description: string; email?: string | null; successPath: string; cancelPath: string }) {
  const session = (await stripe("checkout/sessions", {
    mode: "payment",
    "line_items[0][price_data][currency]": p.currency.toLowerCase(),
    "line_items[0][price_data][product_data][name]": p.description.slice(0, 200),
    "line_items[0][price_data][unit_amount]": String(p.amountMinor),
    "line_items[0][quantity]": "1",
    client_reference_id: p.paymentId,
    "metadata[payment_id]": p.paymentId,
    "payment_intent_data[metadata][payment_id]": p.paymentId,
    success_url: `${env.appUrl}${p.successPath}`,
    cancel_url: `${env.appUrl}${p.cancelPath}`,
    ...(p.email ? { customer_email: p.email } : {}),
  })) as { id: string; url: string };
  return session;
}

export function stripeVerifyWebhook(body: string, header: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const ts = parts.t;
  const sig = parts.v1;
  if (!ts || !sig || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  return expected.length === sig.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

async function stripeRefund(paymentIntentId: string, amountMinor: number) {
  const r = (await stripe("refunds", { payment_intent: paymentIntentId, amount: String(amountMinor) })) as { id: string };
  return r.id;
}

/* -------------------------------------------------------------- refunds */

export async function gatewayRefund(gateway: string, gatewayPaymentId: string | null, amountMinor: number, notes: Record<string, string>) {
  if (gateway === "razorpay" && gatewayPaymentId) return razorpayRefund(gatewayPaymentId, amountMinor, notes);
  if (gateway === "stripe" && gatewayPaymentId) return stripeRefund(gatewayPaymentId, amountMinor);
  return `rfnd_demo_${crypto.randomBytes(6).toString("hex")}`;
}
