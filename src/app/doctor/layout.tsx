import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { PortalShell } from "@/components/portal/portal-shell";
import { getI18n } from "@/i18n/server";
import { doctorForUser } from "@/server/consult";
import { doctorOpenChats } from "@/server/doctor-portal";
import { doctorPaymentQueue } from "@/server/direct-payments";

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession({ roles: ["doctor"] });
  const { t } = await getI18n();
  const d = await doctorForUser(session.user);
  if (!d) redirect("/login");
  const chats = d.verificationStatus === "approved" ? await doctorOpenChats(d) : [];
  const queue = d.verificationStatus === "approved" ? await doctorPaymentQueue(d.id) : { toConfirm: [], toRefund: [] };
  const nav =
    d.verificationStatus === "approved"
      ? [
          { href: "/doctor", label: t("Today"), icon: "home" },
          { href: "/doctor/schedule", label: t("Availability"), icon: "calendar" },
          { href: "/doctor/payments", label: t("Payments"), icon: "receipt", badge: queue.toConfirm.length + queue.toRefund.length },
          { href: "/doctor/messages", label: t("Messages"), icon: "message", badge: chats.filter((c) => c.needsReply).length },
          { href: "/doctor/earnings", label: t("Earnings"), icon: "coins" },
          { href: "/doctor/reviews", label: t("Reviews"), icon: "star" },
          { href: "/doctor/profile", label: t("Profile and fees"), icon: "user" },
          { href: "/doctor/licences", label: t("Registration"), icon: "badge" },
        ]
      : [
          { href: "/doctor/onboarding", label: t("Get verified"), icon: "badge" },
          { href: "/doctor/profile", label: t("Profile and fees"), icon: "user" },
          { href: "/doctor/schedule", label: t("Availability"), icon: "calendar" },
        ];
  return (
    <PortalShell title={t("Doctor")} nav={nav} idleMinutes={session.idleMinutes}>
      {children}
    </PortalShell>
  );
}
