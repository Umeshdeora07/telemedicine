import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Building2, CheckCircle2, MessageSquare, Phone, Video } from "lucide-react";
import { getViewContext } from "@/server/context";
import { doctorForUser } from "@/server/consult";
import { doctorEarnings, doctorLicenceAlerts, doctorOpenChats, doctorQueue, doctorUpcoming } from "@/server/doctor-portal";
import { PageHeader } from "@/components/ui/page-header";
import { doctorPaymentQueue } from "@/server/direct-payments";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { RunningLate } from "@/components/doctor/available-toggle";
import { ageFrom } from "@/lib/utils";

export const metadata: Metadata = { title: "Today" };

const ICON = { video: Video, audio: Phone, chat: MessageSquare, in_clinic: Building2 } as const;

export default async function DoctorToday() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const d = await doctorForUser(ctx.user!);
  if (!d) redirect("/login");
  if (d.verificationStatus !== "approved") redirect("/doctor/onboarding");
  const [queue, upcoming, earnings, licences, chats, payQueue] = await Promise.all([doctorQueue(d), doctorUpcoming(d, 3), doctorEarnings(d), doctorLicenceAlerts(d), doctorOpenChats(d), doctorPaymentQueue(d.id)]);
  const active = queue.filter((q) => ["confirmed", "checked_in", "in_progress"].includes(q.a.status));
  const done = queue.filter((q) => q.a.status === "completed").length;
  const expiring = licences.filter((l) => l.status === "verified" && l.daysLeft !== null && l.daysLeft <= 60);
  const late = Math.max(0, ...active.map((q) => q.a.doctorRunningLateMinutes));
  const reverifyDays = d.reverifyDueAt ? Math.ceil((d.reverifyDueAt.getTime() - Date.now()) / 86400_000) : null;

  return (
    <div className="space-y-6">
      <PageHeader title={t("Good to see you, {name}", { name: d.fullName })} description={t("Today, {date} · times in {zone}", { date: fmt.date(new Date(), d.timeZone, { weekday: "long", day: "numeric", month: "long" }), zone: fmt.zone(d.timeZone) })} />
      {payQueue.toConfirm.length || payQueue.toRefund.length ? (
        <Alert tone="warning" title={t("Payments need your attention")}>
          {payQueue.toConfirm.length ? t("{n} payment(s) to confirm.", { n: payQueue.toConfirm.length }) : null}{" "}
          {payQueue.toRefund.length ? t("{n} refund(s) to send.", { n: payQueue.toRefund.length }) : null}{" "}
          <Link href="/doctor/payments" className="font-semibold underline">{t("Open payments")}</Link>
        </Alert>
      ) : null}
      {expiring.map((l) => (
        <Alert key={l.id} tone={l.daysLeft! <= 15 ? "danger" : "warning"} title={t("Licence expires in {n} days", { n: l.daysLeft })}>
          {t("{body} registration {num}. Upload the renewed certificate so you stay visible to patients.", { body: l.issuingBody, num: l.number })} <Link href="/doctor/licences" className="font-semibold underline">{t("Update licence")}</Link>
        </Alert>
      ))}
      {reverifyDays !== null && reverifyDays <= 60 ? <Alert tone="warning" title={t("Yearly registration check due in {n} days", { n: reverifyDays })}>{t("Our team will check your registration again. Make sure your documents are current.")}</Alert> : null}

      <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-end">
        <RunningLate minutes={late} />
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [t("Today's patients"), String(active.length + done)],
          [t("Seen today"), String(done)],
          [t("This month (net)"), fmt.money(earnings.net, "INR")],
          [t("Rating"), `${Number(d.ratingAvg).toFixed(1)} ★ (${d.ratingCount})`],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <dt className="text-sm text-fg-muted">{k}</dt>
            <dd className="text-2xl font-extrabold text-heading">{v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="queue" className="space-y-3">
        <h2 id="queue" className="text-xl font-bold">{t("Today's queue")}</h2>
        {active.length ? (
          <ul className="space-y-2">
            {active.map(({ a, patientName, patientDob, patientSex, waiting }) => {
              const Icon = ICON[a.mode];
              return (
                <li key={a.id} className={`card flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${waiting ? "border-success ring-2 ring-success/30" : ""}`}>
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Icon className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0">
                      <p className="font-bold text-heading">
                        {patientName} <span className="font-normal text-fg-muted">· {ageFrom(patientDob) ?? t("age not given")} · {patientSex ? t(patientSex === "female" ? "F" : patientSex === "male" ? "M" : "O") : ""}</span>
                      </p>
                      <p className="text-[0.9375rem]">{a.kind === "instant" ? t("Consult now") : fmt.time(a.startAt, d.timeZone)} · {a.chiefComplaint ?? t("No details yet")}</p>
                      <p className="flex flex-wrap gap-1.5 pt-1">
                        {waiting ? <Badge tone="success">{t("Waiting in room")}</Badge> : null}
                        {a.status === "checked_in" ? <Badge tone="success">{t("Checked in at clinic")}</Badge> : null}
                        {a.status === "in_progress" ? <Badge tone="primary">{t("In progress")}</Badge> : null}
                        {a.consultType === "follow_up" ? <Badge>{t("Follow up")}</Badge> : null}
                        {a.preConsult ? <Badge tone="primary">{t("Form filled")}</Badge> : <Badge tone="warning">{t("No form")}</Badge>}
                        {a.triage ? <Badge tone={a.triage.urgency === "now" ? "danger" : "neutral"}>{t("Symptom check: {u}", { u: t(a.triage.urgency.replace("_", " ")) })}</Badge> : null}
                        {a.interpreterLanguage ? <Badge>{t("Interpreter")}: {a.interpreterLanguage}</Badge> : null}
                      </p>
                    </div>
                  </div>
                  {a.mode === "in_clinic" ? (
                    <ButtonLink href={`/doctor/visits/${a.id}`} variant={a.status === "checked_in" ? "primary" : "outline"}>{t("Open notes")}</ButtonLink>
                  ) : (
                    <ButtonLink href={`/consult/${a.id}`} variant={waiting || a.status === "in_progress" ? "primary" : "outline"}>
                      <Video className="size-4" aria-hidden />
                      {a.status === "in_progress" ? t("Rejoin") : t("Start consult")}
                    </ButtonLink>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={<CheckCircle2 className="size-7" aria-hidden />} title={t("No more patients today")}>{t("New bookings will appear here.")}</EmptyState>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card space-y-2 p-4">
          <h2 className="font-bold">{t("Next few days")}</h2>
          <ul className="space-y-1 text-[0.9375rem]">
            {upcoming.slice(0, 8).map((u) => <li key={u.a.id}>{fmt.dateTime(u.a.startAt, d.timeZone)} · {u.patientName} · {t(u.a.mode)}</li>)}
            {!upcoming.length ? <li className="text-fg-muted">{t("Nothing booked yet.")}</li> : null}
          </ul>
          <Link href="/doctor/schedule" className="text-sm font-semibold text-primary underline">{t("Manage availability")}</Link>
        </section>
        <section className="card space-y-2 p-4">
          <h2 className="font-bold">{t("Follow up chats")}</h2>
          <ul className="space-y-1 text-[0.9375rem]">
            {chats.slice(0, 6).map((c) => <li key={c.a.id} className="flex items-center gap-2">{c.needsReply ? <AlertTriangle className="size-4 text-warning" aria-hidden /> : null}<Link href={`/doctor/messages#${c.a.id}`} className="hover:underline">{c.patientName}</Link></li>)}
            {!chats.length ? <li className="text-fg-muted">{t("No open chats.")}</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
