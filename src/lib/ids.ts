import { shortCode } from "./crypto";

/** Human-friendly references shown to patients and support staff. */
export const refs = {
  appointment: () => `CM-${shortCode(6)}`,
  prescription: () => `RX-${shortCode(8)}`,
  internationalCase: () => `IC-${shortCode(6)}`,
  complaint: () => `GR-${shortCode(6)}`,
  secondOpinion: () => `SO-${shortCode(6)}`,
  visaLetter: () => `VL-${shortCode(7)}`,
};

/** Sequential-looking invoice numbers per financial year (Apr–Mar in India). */
export function financialYear(d = new Date()) {
  const y = d.getUTCFullYear();
  const start = d.getUTCMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}
