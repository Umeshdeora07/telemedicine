import { signPayload, verifyPayload } from "./crypto";

export type RxSnapshot = {
  number: string;
  issuedAt: string;
  brand: string;
  doctor: {
    name: string;
    qualifications: string;
    specialty: string;
    registrations: { number: string; issuingBody: string; country: string; region?: string | null }[];
    clinic: { name: string; address: string; phone?: string | null } | null;
    contact: string;
    signatureDocumentId?: string | null;
  };
  patient: { name: string; age: number | null; sex: string | null; location: string };
  consult: { ref: string; mode: string; type: string; date: string };
  diagnosis: string;
  provisional: boolean;
  items: {
    name: string;
    strength: string;
    form: string;
    dose: string;
    frequency: string;
    frequencyLabel: string;
    timing: string;
    durationDays: number;
    instructions: string;
    tpgList: string;
  }[];
  advice: string;
  investigations: string[];
  followUpDate: string | null;
};

export function signRx(snapshot: RxSnapshot) {
  return signPayload(snapshot);
}

export function verifyRx(snapshot: RxSnapshot, signature: string) {
  return verifyPayload(snapshot, signature);
}
