"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { env } from "@/config/env";
import { shortCode } from "@/lib/crypto";
import { requireUser } from "@/server/auth/session";
import { capturePayment, failPayment } from "@/server/booking";
import { captureCasePayment } from "@/server/cases-payments";

/** Test payments only (no gateway connected yet): simulate the bank's answer. No money moves. */
export async function demoPayAction(form: FormData) {
  if (!env.demoMode) throw new Error("Test payments are turned off.");
  const user = await requireUser();
  const id = String(form.get("paymentId"));
  const outcome = String(form.get("outcome"));
  const method = String(form.get("method") ?? "upi");
  const db = await getDb();
  const [p] = await db.select().from(payments).where(and(eq(payments.id, id), eq(payments.userId, user.id), eq(payments.gateway, "demo")));
  if (!p) redirect("/dashboard");
  // Care plans and written second opinions are no longer offered.
  if (p.purpose === "plan" || p.purpose === "second_opinion") redirect("/dashboard");
  if (outcome !== "success") {
    await failPayment(p.id, "Declined (test payment)");
    redirect(`/pay/${p.id}?failed=1`);
  }
  const gatewayPaymentId = `pay_demo_${shortCode(12)}`;
  if (p.purpose === "case_deposit" || p.purpose === "case_final") {
    await captureCasePayment(p.id, gatewayPaymentId, method);
    redirect(`/international/cases/${p.caseId}?paid=1`);
  }
  await capturePayment(p.id, { gatewayPaymentId, method });
  redirect(`/book/done/${p.appointmentId}`);
}
