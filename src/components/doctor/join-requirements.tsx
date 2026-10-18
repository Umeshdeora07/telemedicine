import { CheckList } from "@/components/marketing/blocks";
import type { T } from "@/i18n/translate";

/** What a doctor needs to join, shown before they start (on For doctors and the apply page). */
export function joinRequirements(t: T) {
  return [
    t("Indian registration number and certificate: National Medical Commission or a State Medical Council, or the Rehabilitation Council of India for clinical psychologists."),
    t("Your degree certificate in the specialty."),
    t("A government photo ID (Aadhaar, PAN, passport or driving licence) and a selfie."),
    t("A clear photo of yourself for your profile, and a few lines about you."),
    t("Your fees and the times you are available."),
    t("Your signature, for prescriptions."),
    t("Your UPI ID or bank account: patients pay you directly."),
  ];
}

export function JoinRequirements({ t, className }: { t: T; className?: string }) {
  return <CheckList className={className} items={joinRequirements(t)} />;
}
