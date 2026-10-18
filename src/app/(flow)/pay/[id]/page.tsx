import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { CreditCard, Landmark, Lock, Smartphone, Wallet, XCircle } from "lucide-react";
import { getDb } from "@/db";
import { payments } from "@/db/schema";
import { env } from "@/config/env";
import { brand } from "@/config/brand";
import { getViewContext } from "@/server/context";
import { requireUser } from "@/server/auth/session";
import { demoPayAction } from "@/server/actions/demo-pay";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { METHODS_BY_CURRENCY } from "@/server/payments/gateways";

export const metadata: Metadata = { title: "Test payment" };

const ICON = { upi: Smartphone, card: CreditCard, netbanking: Landmark, wallet: Wallet, intl_card: CreditCard } as const;

/**
 * Shown only while no payment gateway is connected (demo mode). It stands in
 * for the gateway's own page, asks for no card details and takes no money.
 */
export default async function TestPaymentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ failed?: string }> }) {
  if (!env.demoMode) notFound();
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const db = await getDb();
  const [p] = await db.select().from(payments).where(and(eq(payments.id, id), eq(payments.userId, user.id)));
  if (!p) notFound();
  const { t, fmt } = await getViewContext();
  const methods = METHODS_BY_CURRENCY(p.currency);
  const label = { upi: t("UPI"), card: t("Card"), netbanking: t("Net banking"), wallet: t("Wallet"), intl_card: t("International card") };
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-center text-2xl font-extrabold">{t("Test payment")}</h1>
      <Alert tone="info">{t("Online payment is not connected yet. This test payment does not take any money.")}</Alert>
      <div className="card space-y-5 p-6">
        <div className="text-center">
          <p className="text-fg-muted">{t("Pay {merchant}", { merchant: brand.name })}</p>
          <p className="text-4xl font-extrabold text-heading">{fmt.money(p.amountMinor, p.currency)}</p>
        </div>
        {sp.failed ? (
          <p role="alert" className="flex items-center gap-2 rounded-xl bg-danger-soft p-3 text-danger">
            <XCircle className="size-5 shrink-0" aria-hidden />
            {t("The payment was declined and no money was taken. Please try again or choose another way to pay.")}
          </p>
        ) : null}
        {p.status === "captured" ? (
          <Alert tone="success">{t("This has already been paid.")}</Alert>
        ) : (
          <form action={demoPayAction} className="space-y-4">
            <input type="hidden" name="paymentId" value={p.id} />
            <fieldset>
              <legend className="mb-2 font-semibold">{t("Pay with")}</legend>
              <div className="grid grid-cols-2 gap-2">
                {methods.map((m, i) => {
                  const Icon = ICON[m];
                  return (
                    <label key={m} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-field p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                      <input type="radio" name="method" value={m} defaultChecked={i === 0} className="size-5 accent-[var(--primary)]" />
                      <Icon className="size-5 text-primary" aria-hidden />
                      {label[m]}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <SubmitButton name="outcome" value="success" size="lg" className="w-full">
              <Lock className="size-5" aria-hidden />
              {t("Simulate successful payment")}
            </SubmitButton>
            <SubmitButton name="outcome" value="fail" variant="outline" className="w-full">
              {t("Simulate a declined payment")}
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
