import "server-only";
import type { PatientLocation } from "./doctors";

/** The consult jurisdiction stored on every booking. */
export const INDIA: PatientLocation = { country: "IN", region: null };

/**
 * Which rules apply to a consult. Every consultation is with a doctor
 * registered in India and is given under India's telemedicine rules, wherever
 * the patient lives, so this is always India.
 */
export function resolveLocation(): PatientLocation {
  return INDIA;
}
