import { describe, expect, it } from "vitest";
import { parseVisitPassToken, visitPassToken } from "@/lib/visit-pass";
import { canonicalJson, decryptText, encryptText, safeEqual } from "@/lib/crypto";

const id = "3f1c2a9e-5b7d-4c1e-9a2b-1234567890ab";

describe("visit pass tokens", () => {
  it("round-trips a valid pass", () => {
    expect(parseVisitPassToken(visitPassToken(id))).toBe(id);
  });
  it("rejects a forged signature", () => {
    const t = visitPassToken(id);
    expect(parseVisitPassToken(t.slice(0, -2) + (t.endsWith("aa") ? "bb" : "aa"))).toBeNull();
  });
  it("rejects a pass for another appointment", () => {
    const [, sig] = visitPassToken(id).split(".");
    expect(parseVisitPassToken(`4f1c2a9e-5b7d-4c1e-9a2b-1234567890ab.${sig}`)).toBeNull();
  });
});

describe("crypto helpers", () => {
  it("encrypts and decrypts text (passport numbers)", () => {
    const enc = encryptText("P1234567");
    expect(enc).not.toContain("P1234567");
    expect(decryptText(enc)).toBe("P1234567");
  });
  it("canonical JSON is key-order independent (signed prescriptions)", () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 3, c: 4 }] })).toBe(canonicalJson({ a: [2, { c: 4, d: 3 }], b: 1 }));
  });
  it("compares secrets safely", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
