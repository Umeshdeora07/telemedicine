"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { documents, payments } from "@/db/schema";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { submitDirectPayment } from "@/server/booking";

export type DirectPayState = { error?: string };

/** The patient paid the doctor directly and tells us the payment reference. */
export async function submitDirectPaymentAction(_prev: DirectPayState, form: FormData): Promise<DirectPayState> {
  const t = await getT();
  const user = await requireUser();
  const v = z
    .object({
      paymentId: z.string().uuid(),
      method: z.enum(["upi", "bank", "other"]),
      reference: z.string().trim().min(4).max(60),
      proofDocumentId: z.string().uuid().optional().or(z.literal("")),
    })
    .safeParse({ paymentId: form.get("paymentId"), method: form.get("method"), reference: form.get("reference"), proofDocumentId: form.get("proofDocumentId") ?? "" });
  if (!v.success) return { error: t("Please choose how you paid and enter the payment reference (the UTR or transaction ID from your payment app or bank).") };
  const db = await getDb();
  const [p] = await db.select({ appointmentId: payments.appointmentId }).from(payments).where(and(eq(payments.id, v.data.paymentId), eq(payments.userId, user.id)));
  if (!p?.appointmentId) return { error: t("This payment can't be changed now.") };
  let proof: string | null = null;
  if (v.data.proofDocumentId) {
    const [doc] = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.id, v.data.proofDocumentId), eq(documents.appointmentId, p.appointmentId), eq(documents.uploadedByUserId, user.id)));
    proof = doc?.id ?? null;
  }
  try {
    await submitDirectPayment(v.data.paymentId, user.id, { reference: v.data.reference, method: v.data.method, proofDocumentId: proof });
  } catch (e) {
    return { error: t((e as Error).message) };
  }
  redirect(`/book/done/${p.appointmentId}`);
}
