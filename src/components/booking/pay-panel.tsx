"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Landmark, Lock, Smartphone, Wallet } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { applyCouponAction, payAction, removeCouponAction } from "@/server/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

const METHOD_ICON = { upi: Smartphone, card: CreditCard, netbanking: Landmark, wallet: Wallet, intl_card: CreditCard } as const;

export function PayPanel({
  apptId,
  methods,
  totalLabel,
  couponCode,
  covered,
  holdUntil,
}: {
  apptId: string;
  methods: (keyof typeof METHOD_ICON)[];
  totalLabel: string;
  couponCode: string | null;
  covered: boolean;
  holdUntil: string | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [method, setMethod] = useState(methods[0]);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!holdUntil) return;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(holdUntil).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [holdUntil]);

  const pay = () =>
    start(async () => {
      setMsg(null);
      const r = await payAction(apptId, method!);
      if (r.kind === "error") return setMsg({ tone: "error", text: r.error });
      if (r.kind === "redirect") {
        if (r.url.startsWith("http")) window.location.href = r.url;
        else router.push(r.url);
        return;
      }
      if (r.kind === "razorpay") {
        await new Promise<void>((resolve, reject) => {
          if (window.Razorpay) return resolve();
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("load"));
          document.body.appendChild(s);
        }).catch(() => setMsg({ tone: "error", text: t("Couldn't load the payment window. Check your connection and try again.") }));
        if (!window.Razorpay) return;
        const rzp = new window.Razorpay({
          ...r.options,
          method: method === "netbanking" ? "netbanking" : method,
          handler: async (resp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
            const res = await fetch("/api/payments/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId: r.paymentId, ...resp }) });
            if (res.ok) router.push(`/book/done/${apptId}`);
            else setMsg({ tone: "error", text: t("We couldn't confirm the payment. If money was taken, it will be refunded automatically.") });
          },
          theme: { color: "#0F766E" },
        });
        rzp.on("payment.failed", () => setMsg({ tone: "error", text: t("Payment failed. No money was taken. Please try again or use another method.") }));
        rzp.open();
      }
    });

  const methodLabel = { upi: t("UPI"), card: t("Card"), netbanking: t("Net banking"), wallet: t("Wallet"), intl_card: t("International card") };
  const expired = left === 0;

  return (
    <div className="space-y-5">
      {left !== null ? (
        <p role="timer" aria-live="off" className={cn("rounded-xl p-3 text-center text-[0.9375rem]", expired ? "bg-danger-soft text-danger" : "bg-accent-soft")}>
          {expired ? t("Your hold on this time has ended. You can still try to pay — if the slot was taken, we'll ask you to pick another.") : t("We're holding this time for you for {time}", { time: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` })}
        </p>
      ) : null}

      {!covered ? (
        <div className="space-y-2">
          <label htmlFor="coupon" className="font-semibold text-heading">{t("Coupon code")}</label>
          {couponCode ? (
            <div className="flex items-center justify-between rounded-xl bg-success-soft p-3">
              <span>
                <strong>{couponCode}</strong> {t("applied")}
              </span>
              <Button variant="link" onClick={() => start(async () => { await removeCouponAction(apptId); router.refresh(); })}>
                {t("Remove")}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="FIRST50" autoComplete="off" className="uppercase" />
              <Button
                variant="outline"
                disabled={!code || pending}
                onClick={() =>
                  start(async () => {
                    const r = await applyCouponAction(apptId, code);
                    if (r.ok) {
                      setMsg({ tone: "ok", text: t("Coupon applied.") });
                      router.refresh();
                    } else setMsg({ tone: "error", text: r.error });
                  })
                }
              >
                {t("Apply")}
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {!covered ? (
        <fieldset>
          <legend className="mb-2 font-semibold text-heading">{t("Pay with")}</legend>
          <div className="grid grid-cols-2 gap-2">
            {methods.map((m) => {
              const Icon = METHOD_ICON[m];
              return (
                <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)} className={cn("tap flex items-center gap-2 rounded-xl border px-3 py-2.5 font-medium", method === m ? "border-primary bg-primary-soft ring-2 ring-primary" : "border-field bg-surface")}>
                  <Icon className="size-5 text-primary" aria-hidden />
                  {methodLabel[m]}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {msg ? <p role={msg.tone === "error" ? "alert" : "status"} className={msg.tone === "error" ? "font-medium text-danger" : "text-success"}>{msg.text}</p> : null}

      <Button size="lg" className="w-full" onClick={pay} disabled={pending}>
        <Lock className="size-5" aria-hidden />
        {covered ? t("Confirm booking") : t("Pay {amount} securely", { amount: totalLabel })}
      </Button>
      <p className="text-center text-sm text-fg-muted">{t("Payments are processed by a PCI-DSS compliant gateway. We never see or store your card details.")}</p>
    </div>
  );
}
