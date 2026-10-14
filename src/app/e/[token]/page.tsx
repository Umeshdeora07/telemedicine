import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Phone, Siren } from "lucide-react";
import { emergencyCardByToken } from "@/server/patient-app";
import { getI18n } from "@/i18n/server";
import { ageFrom } from "@/lib/utils";

export const metadata: Metadata = { title: "Emergency medical information", robots: { index: false, follow: false } };

/** What a first responder sees after scanning someone's emergency card. */
export default async function EmergencyCardPublic({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t } = await getI18n();
  const r = await emergencyCardByToken(token);
  if (!r) notFound();
  const { p, country } = r;
  const em = country?.emergency;
  return (
    <main id="main" className="mx-auto max-w-md space-y-4 p-4">
      <div className="overflow-hidden rounded-2xl border-2 border-danger">
        <div className="bg-danger-solid p-4 text-on-danger">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide"><Siren className="size-5" aria-hidden />{t("Emergency medical information")}</p>
          <h1 className="text-2xl font-extrabold">{p.fullName}</h1>
          <p>{[ageFrom(p.dob) !== null ? t("{n} years", { n: ageFrom(p.dob)! }) : null, p.sex ? t(p.sex === "female" ? "Female" : p.sex === "male" ? "Male" : "Other") : null].filter(Boolean).join(" · ")}</p>
        </div>
        <dl className="space-y-3 bg-surface p-4 text-lg">
          <div><dt className="text-sm font-semibold text-fg-muted">{t("Blood group")}</dt><dd className="text-2xl font-extrabold">{p.bloodGroup ?? t("Unknown")}</dd></div>
          <div><dt className="text-sm font-semibold text-danger">{t("Allergies")}</dt><dd className="font-bold">{p.allergies.join(", ") || t("None known")}</dd></div>
          <div><dt className="text-sm font-semibold text-fg-muted">{t("Conditions")}</dt><dd>{p.conditions.join(", ") || "—"}</dd></div>
          <div><dt className="text-sm font-semibold text-fg-muted">{t("Regular medicines")}</dt><dd>{p.currentMedicines.join("; ") || "—"}</dd></div>
        </dl>
      </div>
      {p.emergencyContact ? (
        <a href={`tel:${p.emergencyContact.phone}`} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-lg font-bold text-on-primary">
          <Phone className="size-5" aria-hidden />{t("Call {name}", { name: p.emergencyContact.name })}{p.emergencyContact.relationship ? ` (${p.emergencyContact.relationship})` : ""}
        </a>
      ) : null}
      {em ? (
        <a href={`tel:${em.ambulance ?? em.general}`} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-danger-solid px-4 text-lg font-bold text-on-danger">
          <Siren className="size-5" aria-hidden />{t("Call ambulance {n}", { n: em.ambulance ?? em.general })}
        </a>
      ) : null}
      <p className="text-center text-sm text-fg-muted">{t("Shared by the person on this card. This view is logged.")}</p>
    </main>
  );
}
