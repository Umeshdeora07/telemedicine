import type { ReactNode } from "react";
import { PHOTOS } from "@/config/images";
import type { T } from "@/i18n/translate";
import { Photo } from "@/components/ui/photo";
import { SectionHeading, StepList, type Step } from "./blocks";

/** The five steps of a treatment trip to India (home page and /treatment-in-india). */
export function treatmentSteps(t: T): Step[] {
  return [
    {
      title: t("Send your reports"),
      text: t("Tell us about the health problem and upload your recent reports, scans and current prescriptions."),
    },
    {
      title: t("Get your treatment plan"),
      text: t("A specialist reviews your reports, usually within 2 working days. You receive a written treatment plan and a cost estimate in your currency."),
    },
    {
      title: t("Get your visa letter"),
      text: t("When you decide to go ahead, we help you get the invitation letter for India's e-Medical visa, and for an e-Medical Attendant visa if family members travel with you."),
    },
    {
      title: t("Travel for your treatment"),
      text: t("We can arrange your airport pickup and a stay near the hospital, and an interpreter on request. A coordinator stays by your side throughout."),
    },
    {
      title: t("Recover and follow up from home"),
      text: t("After you go home, you can have follow up consultations online with your doctor, and your records stay in your account."),
    },
  ];
}

/** "How treatment in India works": five steps beside the traveller photo. */
export function TreatmentJourney({ t, id, title, description, actions }: { t: T; id: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-card lg:aspect-[4/5]">
        <Photo photo="traveller" alt={t(PHOTOS.traveller.alt)} sizes="(min-width: 1024px) 30rem, 100vw" className="absolute inset-0" />
      </div>
      <div className="min-w-0 space-y-6">
        <SectionHeading id={id} title={title} description={description} />
        <StepList steps={treatmentSteps(t)} layout="column" />
        {actions ? <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div> : null}
      </div>
    </div>
  );
}
