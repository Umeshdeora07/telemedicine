/**
 * Doctors are paid directly by their patients (UPI or bank transfer). Each
 * doctor adds their own payment details and fee list on their dashboard.
 */

/** A doctor's own way to be paid. Shown only to a patient paying for a booking with that doctor. */
export type PaymentDetails = {
  upiId?: string;
  /** Uploaded UPI QR code image (documents table). */
  qrDocumentId?: string;
  accountName?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  /** For patients paying from outside India by international bank transfer. */
  swift?: string;
  notes?: string;
};

/** A treatment or other fee the doctor lists on their profile, in INR minor units. */
export type FeeItem = { name: string; fromMinor: number; toMinor?: number | null; note?: string };

/** True when patients can pay this doctor directly (UPI or a complete bank account). */
export function acceptsDirectPayment(p: PaymentDetails | null | undefined): p is PaymentDetails {
  return Boolean(p && (p.upiId || p.qrDocumentId || (p.accountName && p.accountNumber && p.ifsc)));
}
