import type { Metadata } from "next";
import { CalendarCheck } from "lucide-react";
import { getViewContext } from "@/server/context";
import { listAppointments } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { AppointmentCard } from "@/components/patient/appointment-card";

export const metadata: Metadata = { title: "My consults" };

export default async function ConsultsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t } = ctx;
  const tab = sp.tab === "past" || sp.tab === "cancelled" ? sp.tab : "upcoming";
  const rows = await listAppointments(ctx.user!.id, tab);
  return (
    <div className="space-y-6">
      <PageHeader title={t("My consults")} description={t("Consults and clinic visits for you and your family. Times in {zone}.", { zone: ctx.fmt.zone() })} actions={<ButtonLink href="/consult-now">{t("Consult now")}</ButtonLink>} />
      <LinkTabs
        label={t("Consults")}
        current={tab}
        tabs={[
          { key: "upcoming", href: "/consults", label: t("Upcoming") },
          { key: "past", href: "/consults?tab=past", label: t("Past") },
          { key: "cancelled", href: "/consults?tab=cancelled", label: t("Cancelled") },
        ]}
      />
      {rows.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <AppointmentCard key={r.a.id} r={r} ctx={ctx} showJoin={tab !== "cancelled"} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<CalendarCheck className="size-7" aria-hidden />} title={tab === "upcoming" ? t("No upcoming consults") : t("Nothing here yet")}>
          {tab === "upcoming" ? t("Book a consult and it will show here.") : null}
        </EmptyState>
      )}
    </div>
  );
}
