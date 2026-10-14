import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getViewContext } from "@/server/context";
import { doctorForUser } from "@/server/consult";
import { doctorLicenceAlerts } from "@/server/doctor-portal";
import { getCountries } from "@/server/queries/reference";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { LicenceForm } from "@/components/doctor/onboarding-forms";

export const metadata: Metadata = { title: "Licences" };

const TONE = { pending: "warning", verified: "success", rejected: "danger", expired: "danger", suspended: "danger" } as const;

export default async function DoctorLicences() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const d = (await doctorForUser(ctx.user!))!;
  const [lic, countries] = await Promise.all([doctorLicenceAlerts(d), getCountries()]);
  const name = (code: string) => countries.find((c) => c.code === code)?.name ?? code;
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={t("Licences")}
        description={t("Patients see you only in places where you hold a verified licence. We remind you 60 and 15 days before a licence expires, and hide you there on the day it expires.")}
      />
      {d.reverifyDueAt ? <Alert tone="info">{t("Next annual re-verification: {date}", { date: fmt.date(d.reverifyDueAt) })}</Alert> : null}
      <ul className="space-y-3">
        {lic.map((l) => (
          <li key={l.id} className="card space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="size-5 text-primary" aria-hidden />
              <strong className="text-lg">{[l.region, t(name(l.country))].filter(Boolean).join(", ")}</strong>
              <Badge tone={TONE[l.status]} className="ms-auto">{t(l.status)}</Badge>
            </div>
            <p>{l.issuingBody} · {t("Reg. no. {n}", { n: l.number })}</p>
            <p className="text-sm text-fg-muted">
              {l.expiresAt ? t("Valid until {date}", { date: fmt.date(l.expiresAt) }) : t("No expiry date")}
              {l.verifiedAt ? ` · ${t("Verified on {date}", { date: fmt.date(l.verifiedAt) })}` : ""}
            </p>
            {l.daysLeft !== null && l.daysLeft <= 60 && l.status === "verified" ? (
              <Alert tone={l.daysLeft <= 15 ? "danger" : "warning"}>{l.daysLeft < 0 ? t("Expired. Patients there can no longer see you.") : t("Expires in {n} days. Add the renewed licence below.", { n: l.daysLeft })}</Alert>
            ) : null}
            {l.status === "rejected" && l.notes ? <Alert tone="danger">{l.notes}</Alert> : null}
          </li>
        ))}
      </ul>
      <section className="card space-y-4 p-5" aria-labelledby="add">
        <h2 id="add" className="text-xl font-bold">{t("Add or renew a licence")}</h2>
        <LicenceForm countries={countries.map((c) => ({ code: c.code, name: c.name, licenceScope: c.licenceScope, regions: c.regions }))} />
      </section>
    </div>
  );
}
