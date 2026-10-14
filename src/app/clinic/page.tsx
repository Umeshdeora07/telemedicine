import type { Metadata } from "next";
import Link from "next/link";
import { Building2, QrCode, Video } from "lucide-react";
import { getViewContext } from "@/server/context";
import { clinicVisits, currentClinic } from "@/server/clinic-portal";
import { listCasesForStaff } from "@/server/cases";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { maskPhone } from "@/lib/utils";
import { statusBadge } from "@/components/patient/appointment-card";

export const metadata: Metadata = { title: "Clinic desk" };


export default async function ClinicToday() {
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const clinic = (await currentClinic(user!))!;
  const [visits, cases] = await Promise.all([clinicVisits(clinic), listCasesForStaff(user!)]);
  const waiting = visits.filter((v) => v.a.status === "checked_in").length;
  const expected = visits.filter((v) => v.a.status === "confirmed").length;
  const openCases = cases.filter((c) => !["closed", "discharged"].includes(c.c.status));
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Today at {clinic}", { clinic: clinic.name })}
        description={fmt.date(new Date(), clinic.timeZone, { weekday: "long", day: "numeric", month: "long" })}
        actions={<ButtonLink href="/clinic/check-in" size="lg"><QrCode className="size-5" aria-hidden />{t("Check in a patient")}</ButtonLink>}
      />
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [t("Visits today"), visits.length],
          [t("Expected"), expected],
          [t("Waiting now"), waiting],
          [t("Open international cases"), openCases.length],
        ].map(([k, v]) => (
          <div key={String(k)} className="card p-4">
            <dt className="text-sm text-fg-muted">{k}</dt>
            <dd className="text-3xl font-extrabold text-heading">{v}</dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby="visits" className="space-y-3">
        <h2 id="visits" className="text-lg font-bold">{t("Visit list")}</h2>
        {visits.length ? (
          <ul className="card divide-y divide-line">
            {visits.map((v) => (
              <li key={v.a.id}>
                <Link href={`/clinic/visits/${v.a.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 hover:bg-surface-2">
                  <span className="w-20 font-bold tabular-nums">{fmt.time(v.a.startAt, clinic.timeZone)}</span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{v.patientName}</span>
                    <span className="block text-sm text-fg-muted">{v.doctorName} · {v.a.ref}{v.patientPhone ? ` · ${maskPhone(v.patientPhone)}` : ""}</span>
                  </span>
                  <span className="ms-auto flex flex-wrap items-center gap-2">
                    {v.hasParent ? <Badge tone="primary"><Video className="size-3.5" aria-hidden />{t("After online consult")}</Badge> : null}
                    {v.a.paymentMode === "at_clinic" ? <Badge tone="warning">{t("Pay at desk")}</Badge> : null}
                    {statusBadge(v.a.status, t)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Building2 className="size-8" aria-hidden />} title={t("No clinic visits today")} />
        )}
      </section>
    </div>
  );
}
