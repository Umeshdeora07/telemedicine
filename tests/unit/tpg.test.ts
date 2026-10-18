import { describe, expect, it } from "vitest";
import { allowedLists, blockReason, checkPrescription } from "@/lib/tpg";

describe("Telemedicine Practice Guidelines 2020 prescribing rules", () => {
  it("first video consult allows List O and A only", () => {
    expect(allowedLists("video", "first")).toEqual(["O", "A"]);
  });
  it("first audio or chat consult allows List O only", () => {
    expect(allowedLists("audio", "first")).toEqual(["O"]);
    expect(allowedLists("chat", "first")).toEqual(["O"]);
  });
  it("follow-ups allow List O, A and B", () => {
    expect(allowedLists("audio", "follow_up")).toEqual(["O", "A", "B"]);
  });
  it("prohibited drugs are always blocked, even in clinic", () => {
    for (const mode of ["video", "audio", "chat", "in_clinic"] as const) {
      expect(blockReason("prohibited", mode, "follow_up")).toMatch(/prohibited/i);
    }
  });
  it("List A on a first audio consult is blocked with a reason", () => {
    expect(blockReason("A", "audio", "first")).toMatch(/video/i);
  });
  it("List B on a first consult is blocked", () => {
    expect(blockReason("B", "video", "first")).toMatch(/follow up/i);
  });
  it("warns about allergies by drug class and duplicates", () => {
    const r = checkPrescription(
      [
        { name: "Amoxicillin 500 mg", genericName: "Amoxicillin", drugClass: "penicillin", tpgList: "O" },
        { name: "Metformin 500 mg", genericName: "Metformin", drugClass: "biguanide", tpgList: "A" },
      ],
      { mode: "video", consultType: "first", allergies: ["Penicillin"], currentMedicines: ["Metformin 500 mg twice daily"] },
    );
    expect(r[0]!.blocked).toBeNull();
    expect(r[0]!.warnings.join(" ")).toMatch(/allerg/i);
    expect(r[1]!.warnings.join(" ")).toMatch(/already takes/i);
  });
});
