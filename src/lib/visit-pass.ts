import { keyedHash, safeEqual } from "./crypto";

/**
 * Visit pass QR token: the appointment id plus a keyed signature, so a pass
 * can be shown again at any time without storing a secret, and can't be
 * forged. Clinic staff must still be signed in to check a patient in.
 */
export function visitPassToken(appointmentId: string) {
  return `${appointmentId}.${keyedHash(`visit-pass:${appointmentId}`).slice(0, 24)}`;
}

export function parseVisitPassToken(token: string): string | null {
  const [id, sig] = token.trim().split(".");
  if (!id || !sig || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const expected = keyedHash(`visit-pass:${id}`).slice(0, 24);
  return safeEqual(sig, expected) ? id : null;
}
