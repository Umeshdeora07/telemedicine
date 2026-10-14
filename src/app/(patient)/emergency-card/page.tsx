import type { Metadata } from "next";
import QRCode from "qrcode";
import { getViewContext } from "@/server/context";
import { myPeople } from "@/server/patient";
import { env } from "@/config/env";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmergencyCardToggle } from "@/components/patient/health-tools";
import { ageFrom } from "@/lib/utils";

export const metadata: Metadata = { title: "Emergency health card" };

export default async function EmergencyCardPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t, user } = ctx;
  const people = (await myPeople(user!.id)).filter((x) => !x.link || (x.link.status === "active" && x.link.canBook));
  const cur = people.find((x) => x.patient.id === sp.p) ?? people[0]!;
  const p = cur.patient;
  const url = p.emergencyCardToken ? `${env.appUrl}/e/${p.emergencyCardToken}` : null;
  const svg = url && p.emergencyCardEnabled ? await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b2545", light: "#ffffff" } }) : null;
  const age = ageFrom(p.dob);
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title={t("Emergency health card")} description={t("A QR code for your phone lock screen or wallet. Anyone who scans it — a paramedic, a stranger helping — sees only your blood group, allergies, conditions, medicines and who to call. Nothing else.")} />
      {people.length > 1 ? <LinkTabs label={t("Whose card")} current={p.id} tabs={people.map((x) => ({ key: x.patient.id, href: `/emergency-card?p=${x.patient.id}`, label: x.link ? x.patient.fullName.split(" ")[0]! : t("Me") }))} /> : null}
      {!p.emergencyContact || !p.allergies.length ? <Alert tone="warning">{t("Add allergies and an emergency contact in your health details first, so the card is useful.")} <a href={`/profile?p=${p.id}#health`} className="font-semibold underline">{t("Edit health details")}</a></Alert> : null}
      <div className="card mx-auto max-w-sm overflow-hidden print:shadow-none">
        <div className="bg-danger-solid px-5 py-3 text-on-danger">
          <p className="text-sm font-bold uppercase tracking-wide">{t("Emergency medical information")}</p>
          <p className="text-xl font-extrabold">{p.fullName}</p>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-4 p-5">
          <dl className="space-y-1.5 text-[0.9375rem]">
            <div><dt className="inline font-semibold">{t("Age")}: </dt><dd className="inline">{age ?? "—"}</dd></div>
            <div><dt className="inline font-semibold">{t("Blood group")}: </dt><dd className="inline">{p.bloodGroup ?? "—"}</dd></div>
            <div><dt className="inline font-semibold text-danger">{t("Allergies")}: </dt><dd className="inline">{p.allergies.join(", ") || "—"}</dd></div>
            <div><dt className="inline font-semibold">{t("Conditions")}: </dt><dd className="inline">{p.conditions.join(", ") || "—"}</dd></div>
            <div><dt className="inline font-semibold">{t("Call")}: </dt><dd className="inline">{p.emergencyContact ? `${p.emergencyContact.name} ${p.emergencyContact.phone}` : "—"}</dd></div>
          </dl>
          {svg ? <div className="w-28 rounded-lg border border-line bg-white p-1" role="img" aria-label={t("QR code for the emergency card")} dangerouslySetInnerHTML={{ __html: svg }} /> : null}
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <EmergencyCardToggle patientId={p.id} on={p.emergencyCardEnabled} />
        {p.emergencyCardEnabled && url ? <ButtonLink href={`/e/${p.emergencyCardToken}`} target="_blank" variant="secondary">{t("See what others see")}</ButtonLink> : null}
      </div>
      <p className="text-center text-sm text-fg-muted">{t("Tip: take a screenshot and set it as your lock screen. Each scan is logged; you can turn the card off any time.")}</p>
    </div>
  );
}
