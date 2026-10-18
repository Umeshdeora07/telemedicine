import { requireSession } from "@/server/auth/session";
import { PortalShell } from "@/components/portal/portal-shell";
import { getI18n } from "@/i18n/server";
import { callbackQueue, interpreterQueue } from "@/server/coordinator";

export default async function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession({ roles: ["care_coordinator", "super_admin"] });
  const { t } = await getI18n();
  const [cb, iq] = await Promise.all([callbackQueue(), interpreterQueue()]);
  const nav = [
    { href: "/coordinator", label: t("Overview"), icon: "home" },
    { href: "/coordinator/callbacks", label: t("Callbacks"), icon: "phone", badge: cb.filter((c) => c.status === "open").length },
    { href: "/coordinator/book", label: t("Book for a patient"), icon: "calendar" },
    { href: "/coordinator/interpreters", label: t("Interpreters"), icon: "message", badge: iq.filter((q) => !q.a.interpreterId).length },
    { href: "/coordinator/cases", label: t("Treatment in India"), icon: "globe" },
  ];
  return (
    <PortalShell title={t("Care team")} nav={nav} idleMinutes={session.idleMinutes}>
      {children}
    </PortalShell>
  );
}
