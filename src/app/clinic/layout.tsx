import { requireSession } from "@/server/auth/session";
import { PortalShell } from "@/components/portal/portal-shell";
import { getI18n } from "@/i18n/server";
import { currentClinic } from "@/server/clinic-portal";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession({ roles: ["clinic_coordinator"] });
  const { t } = await getI18n();
  const clinic = await currentClinic(session.user);
  const nav = [
    { href: "/clinic", label: t("Today"), icon: "home" },
    { href: "/clinic/check-in", label: t("Check in"), icon: "qr" },
    { href: "/clinic/cases", label: t("Treatment in India"), icon: "globe" },
    { href: "/clinic/doctors", label: t("Doctors and slots"), icon: "stethoscope" },
    { href: "/clinic/payments", label: t("Payments"), icon: "receipt" },
  ];
  return (
    <PortalShell title={clinic?.name ?? t("Clinic")} nav={nav} idleMinutes={session.idleMinutes}>
      {clinic ? children : <EmptyState title={t("You're not linked to a clinic yet")}>{t("Ask the platform admin to add you to your clinic's staff.")}</EmptyState>}
    </PortalShell>
  );
}
