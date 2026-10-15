import type { Metadata } from "next";
import { AlarmClock, Pill } from "lucide-react";
import { getViewContext } from "@/server/context";
import { remindersFor } from "@/server/patient-app";
import { myPeople } from "@/server/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AddReminderForm, DoseButtons, ReminderToggle } from "@/components/patient/health-tools";

export const metadata: Metadata = { title: "Medicine reminders" };

export default async function RemindersPage() {
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const [r, people] = await Promise.all([remindersFor(user!), myPeople(user!.id)]);
  const today = new Date().toISOString().slice(0, 10);
  const refills = r.list.filter((x) => x.r.active && x.r.refillAlertDate && x.r.refillAlertDate <= today && (!x.r.endDate || x.r.endDate >= today));
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t("Medicine reminders")} description={t("We remind you (and family, if you allow) at each dose time. Tick when taken so your doctor can see how it's going.")} />
      {"logged7" in r && r.logged7 ? <p className="text-fg-muted">{t("Last 7 days: {taken} of {logged} logged doses taken.", { taken: r.taken7, logged: r.logged7 })}</p> : null}
      {refills.map((x) => (
        <p key={x.r.id} className="rounded-xl bg-warning-soft p-3"><strong>{t("Refill soon:")}</strong> {t("{name} runs out on {date}.", { name: x.r.name, date: fmt.date(x.r.endDate!) })}</p>
      ))}
      <section className="space-y-2" aria-labelledby="today">
        <h2 id="today" className="text-lg font-bold">{t("Today")}</h2>
        {r.today.length ? (
          <ul className="card divide-y divide-line">
            {r.today.map((d) => (
              <li key={`${d.reminderId}-${d.at.toISOString()}`} className="flex flex-wrap items-center gap-3 p-3">
                <span className="w-20 font-bold tabular-nums">{fmt.time(d.at)}</span>
                <span className="min-w-40 flex-1"><span className="block font-semibold">{d.name}</span><span className="block text-sm text-fg-muted">{d.dose}{people.length > 1 ? ` · ${d.patientName}` : ""}</span></span>
                <DoseButtons reminderId={d.reminderId} at={d.at.toISOString()} status={d.status} />
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={<AlarmClock className="size-8" aria-hidden />} title={t("No doses today")}>{t("Open a prescription and tap “Set medicine reminders”, or add one below.")}</EmptyState>}
      </section>
      <section className="space-y-2" aria-labelledby="all">
        <h2 id="all" className="text-lg font-bold">{t("All reminders")}</h2>
        <ul className="card divide-y divide-line">
          {r.list.map(({ r: x, patientName }) => (
            <li key={x.id} className="flex flex-wrap items-center gap-2 p-3">
              <Pill className="size-4 text-primary" aria-hidden />
              <span className="min-w-0 flex-1"><span className="font-semibold">{x.name}</span> <span className="text-sm text-fg-muted">· {x.dose} · {x.times.join(", ")}{x.endDate ? ` · ${t("until {date}", { date: fmt.date(x.endDate) })}` : ""}{people.length > 1 ? ` · ${patientName}` : ""}</span></span>
              {!x.active ? <Badge>{t("Paused")}</Badge> : null}
              <ReminderToggle id={x.id} active={x.active} />
            </li>
          ))}
        </ul>
      </section>
      <section className="card space-y-3 p-5" aria-labelledby="add">
        <h2 id="add" className="text-lg font-bold">{t("Add a reminder")}</h2>
        <AddReminderForm people={people.filter((p) => !p.link || p.link.canViewRecords).map((p) => ({ id: p.patient.id, name: p.patient.fullName }))} />
      </section>
    </div>
  );
}
