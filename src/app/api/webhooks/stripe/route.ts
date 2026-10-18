import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { stripeVerifyWebhook } from "@/server/payments/gateways";
import { capturePayment, failPayment } from "@/server/booking";
import { captureCasePayment } from "@/server/cases-payments";

/** Stripe webhooks: checkout.session.completed / async_payment_failed. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!stripeVerifyWebhook(raw, req.headers.get("stripe-signature") ?? "")) return new NextResponse("bad signature", { status: 400 });
  const evt = JSON.parse(raw) as { type: string; data: { object: { id: string; payment_intent?: string; metadata?: { payment_id?: string } } } };
  const id = evt.data.object.metadata?.payment_id;
  if (!id) return NextResponse.json({ ok: true });
  const db = await getDb();
  const [p] = await db.select().from(payments).where(eq(payments.id, id));
  if (!p) return NextResponse.json({ ok: true });
  if (evt.type === "checkout.session.completed") {
    const gid = evt.data.object.payment_intent ?? evt.data.object.id;
    // Care plans and written second opinions are no longer sold, so those payments are ignored.
    if (p.purpose === "case_deposit" || p.purpose === "case_final") await captureCasePayment(p.id, gid, "intl_card");
    else if (p.purpose !== "plan" && p.purpose !== "second_opinion") await capturePayment(p.id, { gatewayPaymentId: gid, method: "intl_card" });
  }
  if (evt.type === "checkout.session.async_payment_failed" || evt.type === "checkout.session.expired") await failPayment(p.id, evt.type);
  return NextResponse.json({ ok: true });
}
