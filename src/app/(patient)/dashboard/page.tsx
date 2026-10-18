import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CalendarCheck, FileText, Plane, Stethoscope, Video } from "lucide-react";
import { getViewContext } from "@/server/context";
import { listAppointments, myPeople, openActions, recentPrescriptions } from "@/server/patient";
import { listCasesForPatientUser } from "@/server/cases";
import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Photo } from "@/components/ui/photo";
import { AppointmentCard } from "@/components/patient/appointment-card";
import { CaseStatusBadge } from "@/components/cases/case-list";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const u = user!;
  const [upcoming, actions, rx, people, cases] = await Promise.all([
    listAppointments(u.id, "upcoming", 4),
    openActions(u.id),
    recentPrescriptions(u, 3),
    myPeople(u.id),
    listCasesForPatientUser(u.id),
  ]);
  const pendingConsent = people.filter((p) => p.link?.status === "pending_consent");
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: ctx.tz, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const firstName = u.name.split(" ")[0] || "";
  const greeting =
    hour < 12
      ? firstName ? t("Good morning, {name}", { name: firstName }) : t("Good morning")
      : hour < 17
        ? firstName ? t("Good afternoon, {name}", { name: firstName }) : t("Good afternoon")
        : firstName ? t("Good evening, {name}", { name: firstName }) : t("Good evening");

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold">{greeting}</h1>
        <p className="text-lg text-fg-muted">{t("What would you like to do today?")}</p>
      </div>

      {sp.welcome ? (
        <Alert tone="success" title={t("Welcome to {brand}", { brand: brand.name })}>
          {t("You can add family members at any time from your profile.")}
        </Alert>
      ) : null}
      {pendingConsent.length ? (
        <Alert tone="warning" title={t("Waiting for family consent")}>
          {t("{names} still need to confirm that you can manage their care.", { names: pendingConsent.map((p) => p.patient.fullName).join(", ") })}{" "}
          <Link href="/family" className="font-semibold text-primary underline">{t("Manage family")}</Link>
        </Alert>
      ) : null}

      <section aria-label={t("Start here")} className="grid gap-4 md:grid-cols-2">
        {[
          {
            href: "/doctors",
            photo: "onlineDoctor" as const,
            Icon: Video,
            title: t("Book a consultation"),
            text: t("See a verified doctor registered in India on a private video call, from wherever you are."),
            cta: t("Choose a doctor"),
          },
          {
            href: "/international/new",
            photo: "hospitalCorridor" as const,
            Icon: Plane,
            title: t("Get a treatment plan in India"),
            text: t("Send your reports. A specialist reviews them and sends you a written plan and cost estimate."),
            cta: t("Send your reports"),
          },
        ].map(({ href, photo, Icon, title, text, cta }) => (
          <Link key={href} href={href} className="card group flex flex-col overflow-hidden hover:border-primary sm:flex-row md:flex-col lg:flex-row">
            <span className="relative block aspect-[16/9] shrink-0 sm:aspect-auto sm:w-48 md:aspect-[16/9] md:w-auto lg:aspect-auto lg:w-48">
              <Photo photo={photo} alt="" sizes="(min-width: 1024px) 12rem, (min-width: 768px) 50vw, (min-width: 640px) 12rem, 100vw" className="absolute inset-0" />
            </span>
            <span className="flex flex-1 flex-col gap-2 p-5">
              <span className="flex items-center gap-2">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="size-5" />
                </span>
                <span className="text-xl font-extrabold text-heading">{title}</span>
              </span>
              <span className="text-fg-muted">{text}</span>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-1 font-semibold text-primary">
                {cta}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
              </span>
            </span>
          </Link>
        ))}
      </section>

      {actions.length ? (
        <section aria-labelledby="todo" className="space-y-3">
          <h2 id="todo" className="text-xl font-bold">{t("Next steps from your doctor")}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {actions.map(({ action, patientName, doctorName, clinicName, specialtyName, specialtySlug }) => {
              const details = action.details as { reason?: string; tests?: string[]; urgency?: string };
              return (
                <li key={action.id} className="card flex flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    {action.type === "in_person_visit" ? <Building2 className="mt-1 size-6 shrink-0 text-warning" aria-hidden /> : action.type === "tests" ? <FileText className="mt-1 size-6 shrink-0 text-primary" aria-hidden /> : <Stethoscope className="mt-1 size-6 shrink-0 text-primary" aria-hidden />}
                    <div>
                      <p className="font-bold text-heading">
                        {action.type === "in_person_visit"
                          ? t("Clinic visit recommended")
                          : action.type === "specialist_referral"
                            ? t("See a specialist: {s}", { s: t(specialtyName ?? "") })
                            : action.type === "tests"
                              ? t("Tests ordered")
                              : t("Follow up recommended")}
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
                      {t("Book clinic visit")}
                      {clinicName ? `, ${clinicName}` : ""}
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
                      {t("Book a follow up")}
                    </ButtonLink>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="upcoming" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 id="upcoming" className="text-xl font-bold">{t("Upcoming consultations")}</h2>
          <Link href="/consults" className="tap inline-flex items-center font-semibold text-primary">{t("See all")}</Link>
        </div>
        {upcoming.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {upcoming.map((r) => (
              <AppointmentCard key={r.a.id} r={r} ctx={ctx} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<CalendarCheck className="size-7" aria-hidden />} title={t("No consultations booked")} action={<ButtonLink href="/doctors">{t("Book a consultation")}</ButtonLink>}>
            {t("When you book a consultation, it appears here with the time and a link to join.")}
          </EmptyState>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3 p-5" aria-labelledby="rx">
          <h2 id="rx" className="flex items-center gap-2 text-lg font-bold">
            <FileText className="size-5 text-primary" aria-hidden />
            {t("Recent prescriptions")}
          </h2>
          {rx.length ? (
            <ul className="space-y-2">
              {rx.map(({ rx: p, doctorName, patientName }) => (
                <li key={p.id}>
                  <Link href={`/prescriptions/${p.id}`} className="font-semibold text-primary hover:underline">{p.diagnosis || t("Prescription")}</Link>
                  <span className="block text-sm text-fg-muted">
                    {doctorName} · {fmt.date(p.issuedAt)} · {patientName}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-fg-muted">{t("No prescriptions yet. After a consultation, your doctor's prescription appears here.")}</p>
          )}
          <Link href="/records" className="tap inline-flex items-center font-semibold text-primary">{t("Records and prescriptions")}</Link>
        </section>

        <section className="card space-y-3 p-5" aria-labelledby="plans">
          <h2 id="plans" className="flex items-center gap-2 text-lg font-bold">
            <Plane className="size-5 text-primary" aria-hidden />
            {t("Treatment plan status")}
          </h2>
          {cases.length ? (
            <ul className="space-y-3">
              {cases.slice(0, 3).map(({ c, patientName }) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link href={`/international/cases/${c.id}`} className="min-w-0 font-semibold text-primary hover:underline">
                    {c.treatmentInterest}
                  </Link>
                  <CaseStatusBadge status={c.status} t={t} />
                  <span className="block w-full text-sm text-fg-muted">
                    {patientName} · {c.ref} · {t("updated {date}", { date: fmt.date(c.updatedAt) })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-fg-muted">{t("You have not asked for a treatment plan yet. Send your reports and a specialist will review them.")}</p>
          )}
          <Link href={cases.length ? "/international/cases" : "/international/new"} className="tap inline-flex items-center font-semibold text-primary">
            {cases.length ? t("My treatment plans") : t("Get a treatment plan")}
          </Link>
        </section>
      </div>
    </div>
  );
}
