import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { getSession } from "@/server/auth/session";
import { razorpayVerifySignature } from "@/server/payments/gateways";
import { capturePayment } from "@/server/booking";

/** Razorpay Checkout success handler: verify the signature, then confirm. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const body = (await req.json()) as { paymentId: string; razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
  const db = await getDb();
  const [p] = await db.select().from(payments).where(and(eq(payments.id, body.paymentId), eq(payments.userId, session.user.id)));
  if (!p || p.gatewayOrderId !== body.razorpay_order_id) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!razorpayVerifySignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  await capturePayment(p.id, { gatewayPaymentId: body.razorpay_payment_id });
  return NextResponse.json({ ok: true });
}
