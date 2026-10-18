/**
 * Warning signs asked before a consultation. Any of them means the person
 * needs emergency care, which this service does not provide.
 */

export const RED_FLAGS = [
  { id: "chest_pain", label: "Chest pain or pressure, especially if it spreads to the arm, jaw or back, or comes with sweating" },
  { id: "breathing", label: "Severe difficulty breathing, or lips or face turning blue" },
  { id: "stroke", label: "Face drooping, weakness in an arm or leg, or slurred speech" },
  { id: "bleeding", label: "Heavy bleeding that won't stop" },
  { id: "self_harm", label: "Thoughts of harming yourself or ending your life" },
  { id: "allergy", label: "Swelling of the face, lips or tongue, or a severe allergic reaction" },
  { id: "unconscious", label: "Fainting, a fit (seizure), or being very hard to wake up" },
  { id: "pregnancy", label: "Pregnant with heavy bleeding, severe belly pain, or leaking fluid" },
  { id: "injury", label: "A serious injury, burn, poisoning or accident" },
  { id: "baby_fever", label: "A baby under 3 months old with a fever" },
] as const;

export type RedFlagId = (typeof RED_FLAGS)[number]["id"];

/** Compact, URL-safe form so answers can travel in a cookie. */
export function encodeTriage(v: unknown) {
  return Buffer.from(JSON.stringify(v)).toString("base64url");
}
export function decodeTriage<T>(s: string | undefined | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
