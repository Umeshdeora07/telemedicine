import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Building2, CalendarCheck, FileText, HeartPulse, IdCard, Pill, Plane, ShieldPlus, Stethoscope, Users, Video } from "lucide-react";
import { getViewContext } from "@/server/context";
import { activePlans, listAppointments, myNotifications, myPeople, openActions, recentPrescriptions, todaysReminders } from "@/server/patient";
import { getDb } from "@/db";
import { internationalCases, secondOpinions } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AppointmentCard } from "@/components/patient/appointment-card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const u = user!;
  const [upcoming, actions, rx, reminders, plans, notes, people] = await Promise.all([
    listAppointments(u.id, "upcoming", 5),
    openActions(u.id),
    recentPrescriptions(u, 3),
    todaysReminders(u.id),
    activePlans(u.id),
    myNotifications(u.id, 3),
    myPeople(u.id),
  ]);
  const db = await getDb();
  const patientIds = people.map((p) => p.patient.id);
  const cases = patientIds.length ? await db.select().from(internationalCases).where(inArray(internationalCases.patientId, patientIds)) : [];
  const opinions = patientIds.length ? await db.select().from(secondOpinions).where(inArray(secondOpinions.patientId, patientIds)) : [];
  const pendingConsent = people.filter((p) => p.link?.status === "pending_consent");
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: ctx.tz, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const greeting = hour < 12 ? t("Good morning") : hour < 17 ? t("Good afternoon") : t("Good evening");
  const self = people.find((p) => !p.link)?.patient;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-fg-muted">{greeting},</p>
          <h1 className="text-3xl font-extrabold">{u.name.split(" ")[0] || t("there")}</h1>
        </div>
        <div className="grid gap-2 sm:flex">
          <ButtonLink href="/consult-now" size="lg">
            <Video className="size-5" aria-hidden />
            {t("Consult now")}
          </ButtonLink>
          <ButtonLink href="/doctors" size="lg" variant="outline">
            <Stethoscope className="size-5" aria-hidden />
            {t("Find a doctor")}
          </ButtonLink>
        </div>
      </div>

      {sp.welcome ? <Alert tone="success" title={t("Welcome to {brand}!", { brand: brand.name })}>{t("You can add family members any time from the Family page.")}</Alert> : null}
      {pendingConsent.length ? (
        <Alert tone="warning" title={t("Waiting for family consent")}>
          {t("{names} still need to confirm that you can manage their care.", { names: pendingConsent.map((p) => p.patient.fullName).join(", ") })}{" "}
          <Link href="/family" className="font-semibold text-primary underline">{t("Manage family")}</Link>
        </Alert>
      ) : null}

      {actions.length ? (
        <section aria-labelledby="todo" className="space-y-3">
          <h2 id="todo" className="text-xl font-bold">{t("Next steps from your doctor")}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {actions.map(({ action, patientName, doctorName, clinicName, specialtyName, specialtySlug }) => {
              const details = action.details as { reason?: string; tests?: string[]; urgency?: string };
              return (
                <li key={action.id} className="card flex flex-col gap-3 border-accent p-4">
                  <div className="flex items-start gap-3">
                    {action.type === "in_person_visit" ? <Building2 className="mt-1 size-6 text-warning" aria-hidden /> : action.type === "tests" ? <FileText className="mt-1 size-6 text-primary" aria-hidden /> : <Stethoscope className="mt-1 size-6 text-primary" aria-hidden />}
                    <div>
                      <p className="font-bold text-heading">
                        {action.type === "in_person_visit" ? t("Clinic visit recommended") : action.type === "specialist_referral" ? t("See a specialist: {s}", { s: t(specialtyName ?? "") }) : action.type === "tests" ? t("Tests ordered") : t("Follow-up recommended")}
                      </p>
                      <p className="text-[0.9375rem]">
                        {t("For {patient}, from {doctor}", { patient: patientName, doctor: doctorName })}
                        {details.reason ? `: ${details.reason}` : ""}
                      </p>
                      {action.dueBy ? <p className="text-sm text-fg-muted">{t("Please book by {date}", { date: fmt.date(action.dueBy) })}</p> : null}
                    </div>
                  </div>
                  {action.type === "in_person_visit" ? (
                    <ButtonLink href={`/consults/${action.appointmentId}/clinic-visit`} size="sm" className="self-start">
                      {t("Book clinic visit")}{clinicName ? ` · ${clinicName}` : ""}
                    </ButtonLink>
                  ) : action.type === "specialist_referral" ? (
                    <ButtonLink href={`/doctors?specialty=${specialtySlug ?? ""}`} size="sm" className="self-start">
                      {t("Choose a specialist")}
                    </ButtonLink>
                  ) : action.type === "tests" ? (
                    <ButtonLink href={`/consults/${action.appointmentId}#next-steps`} size="sm" className="self-start">
                      {t("Book tests")}
                    </ButtonLink>
                  ) : (
                    <ButtonLink href={`/consults/${action.appointmentId}#next-steps`} size="sm" className="self-start">
                      {t("Book follow-up")}
                    </ButtonLink>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="upcoming" className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 id="upcoming" className="text-xl font-bold">{t("Upcoming consults and visits")}</h2>
          <Link href="/consults" className="tap inline-flex items-center font-semibold text-primary">{t("See all")}</Link>
        </div>
        {upcoming.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {upcoming.map((r) => (
              <AppointmentCard key={r.a.id} r={r} ctx={ctx} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<CalendarCheck className="size-7" aria-hidden />} title={t("Nothing booked yet")} action={<ButtonLink href="/consult-now">{t("Consult now")}</ButtonLink>}>
            {t("When you book a consult or clinic visit, it will appear here with a reminder.")}
          </EmptyState>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card space-y-3 p-5" aria-labelledby="meds">
          <h2 id="meds" className="flex items-center gap-2 text-lg font-bold"><Pill className="size-5 text-primary" aria-hidden />{t("Today's medicines")}</h2>
          {reminders.length ? (
            <ul className="space-y-2">
              {reminders.map(({ r, patientName }) => (
                <li key={r.id} className="flex items-start justify-between gap-2">
                  <span>
                    <strong>{r.name}</strong> <span className="text-fg-muted">— {r.dose}</span>
                    {people.length > 1 ? <span className="block text-sm text-fg-muted">{patientName}</span> : null}
                  </span>
                  <span className="text-sm font-semibold text-primary">{r.times.join(", ")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-fg-muted">{t("No medicine reminders. They're created from your e-prescriptions.")}</p>
          )}
          <Link href="/reminders" className="tap inline-flex items-center font-semibold text-primary">{t("Reminders")}</Link>
        </section>

        <section className="card space-y-3 p-5" aria-labelledby="rx">
          <h2 id="rx" className="flex items-center gap-2 text-lg font-bold"><FileText className="size-5 text-primary" aria-hidden />{t("Recent prescriptions")}</h2>
          {rx.length ? (
            <ul className="space-y-2">
              {rx.map(({ rx: p, doctorName, patientName }) => (
                <li key={p.id}>
                  <Link href={`/prescriptions/${p.id}`} className="font-semibold text-primary hover:underline">{p.diagnosis}</Link>
                  <span className="block text-sm text-fg-muted">{doctorName} · {fmt.date(p.issuedAt)} · {patientName}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-fg-muted">{t("No prescriptions yet.")}</p>
          )}
          <Link href="/records" className="tap inline-flex items-center font-semibold text-primary">{t("Health records")}</Link>
        </section>

        <section className="card space-y-3 p-5" aria-labelledby="notes">
          <h2 id="notes" className="flex items-center gap-2 text-lg font-bold"><Bell className="size-5 text-primary" aria-hidden />{t("Updates")}</h2>
          {notes.length ? (
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id}>
                  <Link href={n.link ?? "/notifications"} className="font-semibold hover:underline">{n.title}</Link>
                  <span className="block text-sm text-fg-muted">{n.body}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-fg-muted">{t("You're all caught up.")}</p>
          )}
          <Link href="/notifications" className="tap inline-flex items-center font-semibold text-primary">{t("All notifications")}</Link>
        </section>
      </div>

      <section aria-labelledby="more" className="space-y-3">
        <h2 id="more" className="text-xl font-bold">{t("Your care")}</h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { href: "/family", Icon: Users, label: t("Family members"), sub: t("{n} people", { n: people.length }) },
            { href: "/health/readings", Icon: HeartPulse, label: t("Readings log"), sub: t("BP, sugar, weight") },
            { href: "/emergency-card", Icon: IdCard, label: t("Emergency card"), sub: self?.emergencyCardEnabled ? t("On") : t("Set up") },
            { href: "/plans", Icon: ShieldPlus, label: t("Care plans"), sub: plans.length ? t(plans[0]!.plan.name) : t("Family and chronic care") },
            { href: "/second-opinion", Icon: Stethoscope, label: t("Second opinion"), sub: opinions.length ? t("{n} requests", { n: opinions.length }) : t("Within 48 hours") },
            { href: "/international/cases", Icon: Plane, label: t("Treatment in India"), sub: cases.length ? cases.map((c) => c.ref).join(", ") : t("Start an enquiry") },
            { href: "/invoices", Icon: FileText, label: t("Invoices"), sub: t("Receipts and GST invoices") },
            { href: "/saved", Icon: Stethoscope, label: t("Saved doctors"), sub: t("See the same doctor again") },
          ].map(({ href, Icon, label, sub }) => (
            <li key={href}>
              <Link href={href} className="card flex h-full flex-col gap-1 p-4 hover:border-primary">
                <Icon className="size-6 text-primary" aria-hidden />
                <span className="font-semibold text-heading">{label}</span>
                <span className="text-sm text-fg-muted">{sub}</span>
              </Link>
            </li>
          ))}
        </ul>
        {cases.length ? (
          <p className="text-sm">
            {cases.map((c) => (
              <Link key={c.id} href={`/international/cases/${c.id}`} className="me-2 inline-flex items-center gap-1 text-primary underline">
                {c.ref} <Badge tone="primary">{t(c.status.replace(/_/g, " "))}</Badge>
              </Link>
            ))}
          </p>
        ) : null}
      </section>
    </div>
  );
}
