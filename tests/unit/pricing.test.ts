import { describe, expect, it } from "vitest";
import { buildQuote, convertFromInr } from "@/lib/pricing";

const common = { platformFeeInrMinor: 2500, gstRate: 0.18, platformState: "Karnataka" };

describe("price quote", () => {
  it("INR: consult fee exempt, GST 18% on platform fee split CGST/SGST within state", () => {
    const q = buildQuote({ ...common, feeMinor: 50000, currency: "INR", rate: 1, billingState: "Karnataka" });
    expect(q.taxMinor).toBe(450);
    expect(q.taxLines.map((l) => l.label)).toEqual(["CGST on platform fee", "SGST on platform fee"]);
    expect(q.totalMinor).toBe(50000 + 2500 + 450);
  });
  it("INR from another state uses IGST", () => {
    const q = buildQuote({ ...common, feeMinor: 50000, currency: "INR", rate: 1, billingState: "Maharashtra" });
    expect(q.taxLines).toHaveLength(1);
    expect(q.taxLines[0]!.label).toMatch(/IGST/);
  });
  it("foreign currency is zero-rated export", () => {
    const q = buildQuote({ ...common, feeMinor: 2000, currency: "GBP", rate: 0.0095 });
    expect(q.taxMinor).toBe(0);
  });
  it("plan-covered consults cost nothing", () => {
    expect(buildQuote({ ...common, feeMinor: 50000, currency: "INR", rate: 1, covered: true }).totalMinor).toBe(0);
  });
  it("online fee credit never makes the total negative", () => {
    const q = buildQuote({ ...common, feeMinor: 30000, currency: "INR", rate: 1, creditMinor: 99999 });
    expect(q.creditMinor).toBe(30000);
    expect(q.totalMinor).toBeGreaterThanOrEqual(0);
  });
  it("percent coupons respect the maximum discount", () => {
    const q = buildQuote({ ...common, feeMinor: 100000, currency: "INR", rate: 1, coupon: { code: "X", kind: "percent", value: 50, maxDiscountMinor: 10000 } });
    expect(q.discountMinor).toBe(10000);
  });
  it("converted prices are rounded up to a tidy step", () => {
    expect(convertFromInr(50000, "USD", 0.012) % 100).toBe(0);
    expect(convertFromInr(50000, "INR", 1)).toBe(50000);
  });
});
