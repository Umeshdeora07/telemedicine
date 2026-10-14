import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { payments, refunds } from "@/db/schema";
import { razorpayVerifyWebhook } from "@/server/payments/gateways";
import { capturePayment, failPayment } from "@/server/booking";

/** Razorpay webhooks: payment.captured, payment.failed, refund.processed. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!razorpayVerifyWebhook(raw, req.headers.get("x-razorpay-signature") ?? "")) return new NextResponse("bad signature", { status: 400 });
  const evt = JSON.parse(raw) as { event: string; payload: { payment?: { entity: { id: string; order_id: string; method?: string; notes?: { payment_id?: string } } }; refund?: { entity: { id: string; status: string } } } };
  const db = await getDb();
  const pay = evt.payload.payment?.entity;
  if (pay) {
    const [p] = await db.select().from(payments).where(eq(payments.gatewayOrderId, pay.order_id));
    if (p) {
      if (evt.event === "payment.captured") await capturePayment(p.id, { gatewayPaymentId: pay.id, method: pay.method });
      if (evt.event === "payment.failed") await failPayment(p.id, "Failed at gateway");
    }
  }
  const refund = evt.payload.refund?.entity;
  if (refund && evt.event.startsWith("refund.")) {
    await db.update(refunds).set({ status: refund.status === "processed" ? "processed" : refund.status === "failed" ? "failed" : "pending" }).where(eq(refunds.gatewayRefundId, refund.id));
  }
  return NextResponse.json({ ok: true });
}
