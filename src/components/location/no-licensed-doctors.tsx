import { BookOpen, HeartHandshake, Plane, ShieldAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import type { T } from "@/i18n/translate";

/**
 * Shown when no verified doctor may consult a patient where they are. We never
 * offer diagnosis or prescriptions there; instead we offer safe alternatives.
 */
export function NoLicensedDoctors({ t, locationLabel, needsRegion }: { t: T; locationLabel: string; needsRegion?: boolean }) {
  if (needsRegion) {
    return (
      <div className="card space-y-2 p-5">
        <h2 className="text-lg font-bold">{t("Which state or province is the patient in?")}</h2>
        <p className="text-fg-muted">{t("In {place}, doctors are licensed by state or province. Choose it above so we only show doctors who may treat the patient there.", { place: locationLabel })}</p>
      </div>
    );
  }
  return (
    <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="no-docs">
      <div className="flex gap-3">
        <ShieldAlert className="mt-1 size-6 shrink-0 text-warning" aria-hidden />
        <div className="space-y-1">
          <h2 id="no-docs" className="text-lg font-bold">{t("No doctor can consult a patient in {place} yet", { place: locationLabel })}</h2>
          <p className="text-fg-muted">
            {t("Doctors may only treat patients where they hold a licence. We don't have a verified doctor licensed for this location, so we can't offer a diagnosis or prescription here. You can still:")}
          </p>
        </div>
      </div>
      <ul className="grid gap-3 md:grid-cols-3">
        <li className="rounded-xl border border-line p-4">
          <HeartHandshake className="mb-2 size-6 text-primary" aria-hidden />
          <h3 className="font-semibold">{t("Book for a family member in India")}</h3>
          <p className="mb-3 text-sm text-fg-muted">{t("If the patient is in India, it's an India consult. You can join the call from anywhere.")}</p>
          <ButtonLink href="/doctors?for=IN" size="sm" variant="secondary">
            {t("Show doctors for India")}
          </ButtonLink>
        </li>
        <li className="rounded-xl border border-line p-4">
          <Plane className="mb-2 size-6 text-primary" aria-hidden />
          <h3 className="font-semibold">{t("Treatment in India")}</h3>
          <p className="mb-3 text-sm text-fg-muted">{t("Send your reports for a written treatment plan and cost estimate from a hospital in India.")}</p>
          <ButtonLink href="/international" size="sm" variant="secondary">
            {t("Start an enquiry")}
          </ButtonLink>
        </li>
        <li className="rounded-xl border border-line p-4">
          <BookOpen className="mb-2 size-6 text-primary" aria-hidden />
          <h3 className="font-semibold">{t("General health information")}</h3>
          <p className="mb-3 text-sm text-fg-muted">{t("Doctor-reviewed articles about common conditions. Not a substitute for a consult.")}</p>
          <ButtonLink href="/health-library" size="sm" variant="secondary">
            {t("Health library")}
          </ButtonLink>
        </li>
      </ul>
    </section>
  );
}
