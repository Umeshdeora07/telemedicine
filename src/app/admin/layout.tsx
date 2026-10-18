import { requireSession } from "@/server/auth/session";
import { PortalShell } from "@/components/portal/portal-shell";
import { getI18n } from "@/i18n/server";
import { getDb } from "@/db";
import { complaints, doctors } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession({ roles: ["super_admin"] });
  const { t } = await getI18n();
  const db = await getDb();
  const [[pending], [open]] = await Promise.all([
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(doctors).where(eq(doctors.verificationStatus, "submitted")),
    db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(complaints).where(inArray(complaints.status, ["open"])),
  ]);
  const nav = [
    { href: "/admin", label: t("Overview"), icon: "chart" },
    { href: "/admin/verification", label: t("Verification"), icon: "badge", badge: pending!.n },
    { href: "/admin/users", label: t("Users"), icon: "users" },
    { href: "/admin/bookings", label: t("Bookings"), icon: "calendar" },
    { href: "/admin/payments", label: t("Payments and refunds"), icon: "receipt" },
    { href: "/admin/complaints", label: t("Complaints"), icon: "ticket", badge: open!.n },
    { href: "/admin/content", label: t("Articles"), icon: "news" },
    { href: "/admin/settings", label: t("Countries, rates and offers"), icon: "settings" },
    { href: "/admin/audit", label: t("Audit log"), icon: "scroll" },
    { href: "/admin/compliance", label: t("Privacy and security"), icon: "shield" },
  ];
  return (
    <PortalShell title={t("Admin")} nav={nav} idleMinutes={session.idleMinutes}>
      {children}
    </PortalShell>
  );
}
