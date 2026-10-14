/**
 * Prescribing rules from India's Telemedicine Practice Guidelines (2020).
 *
 *   First consult by video        → List O and List A
 *   First consult by audio / chat → List O only
 *   Follow-up (same condition)    → List O, List A (refill) and List B (add-on)
 *   Prohibited list               → never by teleconsultation
 *
 * The prohibited list is also blocked for in-clinic e-prescriptions, because
 * those medicines need special prescription formats outside this app.
 */
export type TpgList = "O" | "A" | "B" | "prohibited";
export type Mode = "video" | "audio" | "chat" | "in_clinic";
export type ConsultType = "first" | "follow_up";

export function allowedLists(mode: Mode, consultType: ConsultType): TpgList[] {
  if (mode === "in_clinic") return ["O", "A", "B"];
  if (consultType === "follow_up") return ["O", "A", "B"];
  if (mode === "video") return ["O", "A"];
  return ["O"];
}

export function listLabel(list: TpgList) {
  switch (list) {
    case "O":
      return "List O";
    case "A":
      return "List A";
    case "B":
      return "List B";
    case "prohibited":
      return "Prohibited";
  }
}

export function blockReason(list: TpgList, mode: Mode, consultType: ConsultType): string | null {
  if (list === "prohibited")
    return "This medicine is on the prohibited list (Schedule X / NDPS) and cannot be prescribed through this platform.";
  if (allowedLists(mode, consultType).includes(list)) return null;
  if (list === "B")
    return "List B medicines can only be added in a follow-up consult for a condition already diagnosed in person.";
  if (list === "A") return "List A medicines need a video consult for a first consult. Switch to video or book a clinic visit.";
  return "Not allowed for this consult type.";
}

export type RxItemInput = { name: string; genericName?: string; drugClass?: string; tpgList: TpgList };
export type RxCheckContext = {
  mode: Mode;
  consultType: ConsultType;
  allergies: string[];
  currentMedicines: string[];
};
export type RxItemCheck = { index: number; blocked: string | null; warnings: string[] };

// Allergy words → drug classes that should trigger a warning.
const ALLERGY_CLASSES: [RegExp, string[], string][] = [
  [/penicill|amoxi|ampicill/i, ["penicillin"], "penicillin"],
  [/penicill/i, ["cephalosporin"], "penicillin (possible cross-reaction with cephalosporins)"],
  [/cephalo|cef/i, ["cephalosporin"], "cephalosporin"],
  [/sulf|sulph/i, ["sulfonamide", "sulfonylurea"], "sulfa drugs"],
  [/nsaid|aspirin|ibuprofen|diclofenac|mefenamic|painkiller/i, ["nsaid", "antiplatelet"], "NSAIDs / aspirin"],
  [/macrolide|azithro|erythro|clarithro/i, ["macrolide"], "macrolides"],
  [/quinolone|cipro|levoflox|moxi|oflox/i, ["fluoroquinolone"], "fluoroquinolones"],
  [/tetracycl|doxy/i, ["tetracycline"], "tetracyclines"],
  [/iodine|betadine/i, ["antiseptic"], "iodine"],
  [/metronid/i, ["nitroimidazole"], "metronidazole"],
  [/statin/i, ["statin"], "statins"],
];

// Classes where two medicines at once are usually a duplication.
const DUPLICATE_CLASSES = new Set([
  "penicillin",
  "cephalosporin",
  "macrolide",
  "tetracycline",
  "fluoroquinolone",
  "nsaid",
  "ppi",
  "h2_blocker",
  "antihistamine",
  "statin",
  "arb",
  "ssri",
  "beta_blocker",
  "sulfonylurea",
  "biguanide",
  "antiplatelet",
  "corticosteroid_oral",
  "analgesic_antipyretic",
  "antiemetic",
]);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const firstWord = (s: string) => norm(s).split(" ")[0] ?? "";

export function checkPrescription(items: RxItemInput[], ctx: RxCheckContext): RxItemCheck[] {
  const results: RxItemCheck[] = items.map((item, index) => ({
    index,
    blocked: blockReason(item.tpgList, ctx.mode, ctx.consultType),
    warnings: [],
  }));

  items.forEach((item, i) => {
    const generic = norm(item.genericName || item.name);
    for (const allergy of ctx.allergies) {
      const a = norm(allergy);
      if (!a) continue;
      if (generic.includes(firstWord(a)) && firstWord(a).length > 3) {
        results[i]!.warnings.push(`Patient reports an allergy to "${allergy}".`);
        continue;
      }
      for (const [re, classes, label] of ALLERGY_CLASSES) {
        if (re.test(a) && item.drugClass && classes.includes(item.drugClass)) {
          results[i]!.warnings.push(`Allergy alert: patient reports allergy to ${label}.`);
          break;
        }
      }
    }
    for (const med of ctx.currentMedicines) {
      const w = firstWord(med);
      if (w.length > 3 && generic.startsWith(w)) {
        results[i]!.warnings.push(`Patient already takes ${med}. Check this is not a duplicate.`);
      }
    }
  });

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]!;
      const b = items[j]!;
      const sameGeneric = norm(a.genericName || a.name) === norm(b.genericName || b.name);
      const sameClass = a.drugClass && a.drugClass === b.drugClass && DUPLICATE_CLASSES.has(a.drugClass);
      if (sameGeneric) {
        results[j]!.warnings.push(`Duplicate: ${a.name} is already on this prescription.`);
      } else if (sameClass) {
        results[j]!.warnings.push(`Same medicine group as ${a.name} (${a.drugClass!.replace(/_/g, " ")}). Is that intended?`);
      }
    }
  }
  return results;
}

/** "1-0-1" → plain words, and times for dose reminders. */
export const FREQUENCIES: Record<string, { label: string; times: string[] }> = {
  "1-0-0": { label: "Once a day, in the morning", times: ["08:00"] },
  "0-0-1": { label: "Once a day, at night", times: ["21:00"] },
  "1-0-1": { label: "Twice a day, morning and night", times: ["08:00", "21:00"] },
  "1-1-1": { label: "Three times a day", times: ["08:00", "14:00", "21:00"] },
  "1-1-1-1": { label: "Four times a day", times: ["07:00", "12:00", "17:00", "22:00"] },
  "0-1-0": { label: "Once a day, in the afternoon", times: ["14:00"] },
  SOS: { label: "Only when needed", times: [] },
  weekly: { label: "Once a week", times: ["09:00"] },
  stat: { label: "One dose now", times: [] },
};

export const TIMINGS: Record<string, string> = {
  after_food: "after food",
  before_food: "before food",
  empty_stomach: "on an empty stomach",
  with_food: "with food",
  bedtime: "at bedtime",
  any: "",
};
