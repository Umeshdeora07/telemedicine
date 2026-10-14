import { CURRENCIES, type Currency } from "@/config/currencies";

/** Round converted prices up to a tidy amount so patients don't see 5.37. */
const STEP: Record<Currency, number> = { INR: 100, USD: 100, EUR: 100, GBP: 100, AED: 500, BDT: 1000 };

export function convertFromInr(inrMinor: number, currency: Currency, rate: number) {
  if (currency === "INR") return inrMinor;
  const raw = inrMinor * rate;
  const step = STEP[currency];
  return Math.ceil(raw / step) * step;
}

export function convertToInr(minor: number, currency: Currency, rate: number) {
  if (currency === "INR") return minor;
  return Math.round(minor / rate);
}

export type FeeTable = { mode: string; currency: string; amountMinor: number }[];

/** Doctor's fee for a mode, in the patient's currency (explicit fee first, else converted). */
export function feeFor(fees: FeeTable, mode: string, currency: Currency, rate: number) {
  const explicit = fees.find((f) => f.mode === mode && f.currency === currency);
  if (explicit) return { amountMinor: explicit.amountMinor, converted: false };
  const inr = fees.find((f) => f.mode === mode && f.currency === "INR");
  if (!inr) return null;
  return { amountMinor: convertFromInr(inr.amountMinor, currency, rate), converted: currency !== "INR" };
}

export type Coupon = { code: string; kind: string; value: number; maxDiscountMinor: number | null };

export type Quote = {
  currency: Currency;
  feeMinor: number;
  creditMinor: number;
  discountMinor: number;
  platformFeeMinor: number;
  taxMinor: number;
  taxLines: { label: string; rate: number; amountMinor: number; sac?: string }[];
  totalMinor: number;
};

/**
 * Price breakdown shown before payment.
 * India (INR): consultation by a doctor is an exempt healthcare service; GST
 * at 18% applies to the platform fee (CGST+SGST within the platform's state,
 * IGST otherwise). Payments in other currencies are treated as export of
 * services (zero-rated). Confirm the tax treatment with your tax advisor.
 */
export function buildQuote(opts: {
  feeMinor: number;
  currency: Currency;
  rate: number;
  platformFeeInrMinor: number;
  gstRate: number;
  coupon?: Coupon | null;
  creditMinor?: number;
  covered?: boolean; // by a plan or a free follow-up
  billingState?: string | null;
  platformState: string;
}): Quote {
  const { currency } = opts;
  const covered = Boolean(opts.covered);
  const fee = covered ? 0 : opts.feeMinor;
  const credit = Math.min(opts.creditMinor ?? 0, fee);
  let discount = 0;
  if (opts.coupon && !covered) {
    const base = fee - credit;
    if (opts.coupon.kind === "percent") discount = Math.floor((base * opts.coupon.value) / 100);
    else discount = convertFromInr(opts.coupon.value, currency, opts.rate);
    if (opts.coupon.maxDiscountMinor) discount = Math.min(discount, convertFromInr(opts.coupon.maxDiscountMinor, currency, opts.rate));
    discount = Math.min(discount, base);
  }
  const platform = covered ? 0 : currency === "INR" ? opts.platformFeeInrMinor : convertFromInr(opts.platformFeeInrMinor, currency, opts.rate);
  const taxLines: Quote["taxLines"] = [];
  let tax = 0;
  if (currency === "INR" && platform > 0) {
    tax = Math.round(platform * opts.gstRate);
    const intra = !opts.billingState || opts.billingState === opts.platformState;
    if (intra) {
      const half = Math.floor(tax / 2);
      taxLines.push({ label: "CGST on platform fee", rate: opts.gstRate / 2, amountMinor: half, sac: "998599" });
      taxLines.push({ label: "SGST on platform fee", rate: opts.gstRate / 2, amountMinor: tax - half, sac: "998599" });
    } else {
      taxLines.push({ label: "IGST on platform fee", rate: opts.gstRate, amountMinor: tax, sac: "998599" });
    }
  }
  const total = fee - credit - discount + platform + tax;
  return { currency, feeMinor: fee, creditMinor: credit, discountMinor: discount, platformFeeMinor: platform, taxMinor: tax, taxLines, totalMinor: Math.max(0, total) };
}

export function currencySymbol(c: Currency) {
  return CURRENCIES[c].symbol;
}
