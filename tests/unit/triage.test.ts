import { describe, expect, it } from "vitest";
import { triage, type TriageAnswers } from "@/lib/triage";

const base: TriageAnswers = { age: "adult", redFlags: [], area: "fever", duration: "days", severity: "mild", followUps: {} } as TriageAnswers;

describe("symptom checker", () => {
  it("any red flag means emergency", () => {
    expect(triage({ ...base, redFlags: ["chest_pain"] }).urgency).toBe("emergency");
  });
  it("severe symptoms should be seen now", () => {
    expect(triage({ ...base, severity: "severe" }).urgency).toBe("now");
  });
  it("babies with fever are seen today and routed to a child specialist", () => {
    const r = triage({ ...base, age: "baby" });
    expect(r.urgency).toBe("today");
    expect(r.specialtySlug).toBe("paediatrics");
  });
  it("skin problems go to dermatology for adults", () => {
    expect(triage({ ...base, area: "skin" }).specialtySlug).toBe("dermatology");
  });
  it("always explains the result", () => {
    expect(triage(base).reasons.length).toBeGreaterThan(0);
  });
});
