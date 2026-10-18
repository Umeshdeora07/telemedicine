import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PatientNav } from "@/components/patient/patient-nav";
import { requireSession } from "@/server/auth/session";
import { isStaff, homeFor } from "@/server/auth/roles";
import { getI18n } from "@/i18n/server";
import { brand } from "@/config/brand";

/** Signed in patient and family member area. */
export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (isStaff(session.user.role)) redirect(homeFor(session.user.role));
  const { t } = await getI18n();
  return (
    <>
      <SiteHeader />
      <PatientNav />
      <main id="main" className="container-page pb-28 pt-6 md:pb-12">
        {children}
      </main>
      <footer className="container-page hidden border-t border-line py-6 text-sm text-fg-muted md:flex md:justify-between">
        <span>© {brand.name}</span>
        <span className="flex gap-4">
          <Link href="/help" className="hover:underline">{t("Help centre")}</Link>
          <Link href="/legal/privacy" className="hover:underline">{t("Privacy policy")}</Link>
          <Link href="/legal/grievance" className="hover:underline">{t("Grievance officer")}</Link>
        </span>
      </footer>
      <BottomNav signedIn />
    </>
  );
}
