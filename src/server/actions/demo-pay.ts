"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { env } from "@/config/env";
import { shortCode } from "@/lib/crypto";
import { requireUser } from "@/server/auth/session";
import { capturePayment, failPayment } from "@/server/booking";
import { capturePlanPayment } from "@/server/plans";
import { captureCasePayment } from "@/server/cases-payments";

/** Demo gateway only: simulate the bank's answer. */
export async function demoPayAction(form: FormData) {
  if (!env.demoMode) throw new Error("Demo payments are disabled");
  const user = await requireUser();
  const id = String(form.get("paymentId"));
  const outcome = String(form.get("outcome"));
  const method = String(form.get("method") ?? "upi");
  const db = await getDb();
  const [p] = await db.select().from(payments).where(and(eq(payments.id, id), eq(payments.userId, user.id), eq(payments.gateway, "demo")));
  if (!p) redirect("/dashboard");
  const back = p.appointmentId ? `/book/review/${p.appointmentId}` : p.subscriptionId ? "/pricing" : p.caseId ? `/international/cases/${p.caseId}` : p.secondOpinionId ? "/second-opinion" : "/dashboard";
  if (outcome !== "success") {
    await failPayment(p.id, "Declined (demo)");
    redirect(`/pay/${p.id}?failed=1`);
  }
  const gatewayPaymentId = `pay_demo_${shortCode(12)}`;
  if (p.purpose === "plan") {
    await capturePlanPayment(p.id, gatewayPaymentId, method);
    redirect("/plans?subscribed=1");
  }
  if (p.purpose === "case_deposit" || p.purpose === "case_final") {
    await captureCasePayment(p.id, gatewayPaymentId, method);
    redirect(`/international/cases/${p.caseId}?paid=1`);
  }
  if (p.purpose === "second_opinion") {
    const { captureSecondOpinionPayment } = await import("@/server/second-opinion");
    await captureSecondOpinionPayment(p.id, gatewayPaymentId, method);
    redirect(`/second-opinion/${p.secondOpinionId}?paid=1`);
  }
  await capturePayment(p.id, { gatewayPaymentId, method });
  void back;
  redirect(`/book/done/${p.appointmentId}`);
}
