import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { AlertTriangle, ArrowRight, Building2, CalendarPlus, ClipboardList, Download, FileText, MapPin, MessageSquare, MonitorCheck, Pill, QrCode, Receipt, Video } from "lucide-react";
import { getViewContext } from "@/server/context";
import { consultRecords, getAppointmentForUser, reviewFor } from "@/server/patient";
import { getPolicy, cancellationRefund, paymentForAppointment } from "@/server/booking";
import { getOpenSlots } from "@/server/doctors";
import { getDb, withRls } from "@/db";
import { appointments, consultActions, documents, doctors, messages, partnerOrders, refunds } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { DoctorAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { statusBadge } from "@/components/patient/appointment-card";
import { ManageBooking } from "@/components/patient/manage-booking";
import { ReviewForm } from "@/components/patient/review-form";
import { PartnerOrder } from "@/components/patient/partner-order";
import { FollowUpChat } from "@/components/patient/follow-up-chat";
import { FREQUENCIES, TIMINGS } from "@/lib/tpg";
import { sameClock } from "@/lib/time";

export const metadata: Metadata = { title: "Consultation details" };

export default async function ConsultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const row = await getAppointmentForUser(user!, id);
  if (!row) notFound();
  const a = row.a;
  const db = await getDb();
  const [records, review, payment, policy, actions, docs, journey, orders] = await Promise.all([
    consultRecords(user!, a.id),
    reviewFor(a.id),
    paymentForAppointment(db, a.id),
    getPolicy(db),
    db.select().from(consultActions).where(eq(consultActions.appointmentId, a.id)).orderBy(asc(consultActions.createdAt)),
    withRls({ userId: user!.id, role: user!.role }, (tx) => tx.select().from(documents).where(and(eq(documents.appointmentId, a.id), isNull(documents.deletedAt)))),
    a.journeyId
      ? db.select({ a: appointments, doctorName: doctors.fullName }).from(appointments).innerJoin(doctors, eq(doctors.id, appointments.doctorId)).where(and(eq(appointments.journeyId, a.journeyId), inArray(appointments.status, ["confirmed", "checked_in", "in_progress", "completed"]))).orderBy(asc(appointments.startAt))
      : Promise.resolve([]),
    db.select().from(partnerOrders).where(eq(partnerOrders.appointmentId, a.id)).orderBy(desc(partnerOrders.createdAt)),
  ]);
  const refundRows = payment ? await db.select().from(refunds).where(eq(refunds.paymentId, payment.id)) : [];
  const note = records.note;
  const rx = records.prescriptions[0];
  const upcoming = ["confirmed", "checked_in", "in_progress"].includes(a.status);
  const completed = a.status === "completed";
  const minutesToStart = (a.startAt.getTime() - Date.now()) / 60_000;
  const joinable = a.mode !== "in_clinic" && ["confirmed", "in_progress"].includes(a.status) && minutesToStart < 15;
  const canReschedule = a.status === "confirmed" && minutesToStart > policy.rescheduleFreeHours * 60;
  const slots = canReschedule ? (await getOpenSlots(db, a.doctorId, a.mode === "in_clinic" ? "in_clinic" : "online", { days: 14 })).slice(0, 60) : [];
  const refundIfCancelled = payment ? cancellationRefund({ startAt: a.startAt, totalMinor: payment.amountMinor }, policy, "patient") : 0;
  const chat = completed
    ? await withRls({ userId: user!.id, role: user!.role }, (tx) => tx.select().from(messages).where(eq(messages.appointmentId, a.id)).orderBy(asc(messages.id)).limit(200))
    : [];
  const chatOpen = Boolean(completed && a.followUpChatUntil && a.followUpChatUntil > new Date());
  const modeLabel = { video: t("Video consultation"), audio: t("Audio call"), chat: t("Chat consultation"), in_clinic: t("Clinic visit") }[a.mode];
  const inPerson = actions.find((x) => x.type === "in_person_visit");

  return (
    <div className="space-y-6">
      <nav className="text-sm text-fg-muted"><Link href="/consults" className="hover:underline">{t("My consultations")}</Link> › {a.ref}</nav>
      <PageHeader title={modeLabel} description={t("For {name} · booking {ref}", { name: row.patientName, ref: a.ref })} actions={statusBadge(a.status, t)} />

      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <DoctorAvatar name={row.doctorName} seed={row.doctorSeed} gender={row.doctorGender} photoUrl={row.doctorPhoto} size={64} senior={row.doctorExp >= 20} />
        <div className="min-w-0 flex-1">
          <Link href={`/doctors/${row.doctorSlug}`} className="text-lg font-bold hover:underline">{row.doctorName}</Link>
          <p className="text-fg-muted">{t(row.specialty)}</p>
          <p className="mt-1"><strong>{fmt.dateTime(a.startAt)}</strong> <span className="text-fg-muted">({fmt.zone()})</span></p>
          {!sameClock(a.patientTimeZone, ctx.tz, a.startAt) ? <p className="text-sm text-fg-muted">{t("{name}'s time: {time}", { name: row.patientName, time: fmt.dateTime(a.startAt, a.patientTimeZone) })}</p> : null}
          {row.clinicName ? <p className="flex items-center gap-1 text-sm text-fg-muted"><MapPin className="size-4" aria-hidden />{row.clinicName}, {row.clinicAddress}, {row.clinicCity}</p> : null}
        </div>
        <div className="flex flex-col gap-2">
          {joinable ? <ButtonLink href={`/consult/${a.id}`} size="lg"><Video className="size-5" aria-hidden />{t("Join now")}</ButtonLink> : null}
          {upcoming && a.mode !== "in_clinic" && !joinable ? <ButtonLink href={`/consult/${a.id}/check`} variant="secondary"><MonitorCheck className="size-5" aria-hidden />{t("Test camera and mic")}</ButtonLink> : null}
          {a.mode === "in_clinic" && upcoming ? <ButtonLink href={`/consults/${a.id}/pass`}><QrCode className="size-5" aria-hidden />{t("Visit pass")}</ButtonLink> : null}
          {upcoming ? <a href={`/api/appointments/${a.id}/ics`} className="tap inline-flex items-center justify-center gap-2 rounded-xl border border-field px-4 font-semibold"><CalendarPlus className="size-5" aria-hidden />{t("Add to calendar")}</a> : null}
        </div>
      </section>

      {a.status === "doctor_no_show" ? <Alert tone="warning" title={t("The doctor couldn't join")}>{t("We refunded you in full automatically. We are sorry for the trouble.")} <Link href="/doctors" className="font-semibold text-primary underline">{t("Book another doctor")}</Link></Alert> : null}

      {journey.length > 1 ? (
        <section className="card space-y-3 p-5" aria-labelledby="journey">
          <h2 id="journey" className="text-lg font-bold">{t("Your care journey")}</h2>
          <ol className="flex flex-wrap items-center gap-2">
            {journey.map((j, i) => (
              <li key={j.a.id} className="flex items-center gap-2">
                <Link href={`/consults/${j.a.id}`} aria-current={j.a.id === a.id ? "step" : undefined} className={`rounded-xl border px-3 py-2 text-sm ${j.a.id === a.id ? "border-primary bg-primary-soft font-semibold" : "border-line"}`}>
                  {j.a.mode === "in_clinic" ? <Building2 className="me-1 inline size-4" aria-hidden /> : <Video className="me-1 inline size-4" aria-hidden />}
                  {j.a.mode === "in_clinic" ? t("Clinic visit") : t("Online consultation")} · {fmt.date(j.a.startAt, ctx.tz, { day: "numeric", month: "short", year: undefined })}
                </Link>
                {i < journey.length - 1 ? <ArrowRight className="size-4 text-fg-muted rtl:rotate-180" aria-hidden /> : null}
              </li>
            ))}
          </ol>
          <p className="text-sm text-fg-muted">{t("Notes, reports and payments carry over between the online consultation and the clinic visit.")}</p>
        </section>
      ) : null}

      {upcoming ? (
        <section className="card space-y-3 p-5">
          <h2 className="text-lg font-bold">{t("Before your consultation")}</h2>
          {a.preConsult ? (
            <p className="flex items-center gap-2"><ClipboardList className="size-5 text-success" aria-hidden />{t("You told the doctor: {problem}", { problem: a.preConsult.mainProblem })} <Link className="font-semibold text-primary underline" href={`/consults/${a.id}/prepare`}>{t("Edit")}</Link></p>
          ) : (
            <Alert tone="warning">{t("Please fill in the health form before your consultation, so your doctor knows about the problem.")} <Link className="font-semibold text-primary underline" href={`/consults/${a.id}/prepare`}>{t("Fill in the form (2 minutes)")}</Link></Alert>
          )}
          <p className="text-[0.9375rem] text-fg-muted">{t("Family members can join from anywhere. Open the consultation and use “Invite family or interpreter”.")}</p>
          <ManageBooking
            apptId={a.id}
            canReschedule={canReschedule}
            refundLabel={payment ? (refundIfCancelled >= payment.amountMinor ? t("You will get a full refund of {amount}.", { amount: fmt.money(refundIfCancelled, a.currency) }) : refundIfCancelled > 0 ? t("You will get {amount} back. This is a {pct}% refund, because it is less than {h} hours before the start.", { amount: fmt.money(refundIfCancelled, a.currency), pct: policy.patientCancelPartialRefundPercent, h: policy.patientCancelFullRefundHours }) : t("It is too late for a refund.")) : t("No payment was taken.")}
            slots={slots.map((s) => ({ id: s.id, label: fmt.dateTime(s.startAt) }))}
          />
        </section>
      ) : null}

      {completed && (note || rx) ? (
        <section className="card space-y-4 p-5" aria-labelledby="summary">
          <h2 id="summary" className="text-xl font-bold">{t("Summary from {doctor}", { doctor: row.doctorName })}</h2>
          {note?.patientSummary ? <p className="text-[1.0625rem]">{note.patientSummary}</p> : null}
          {note ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><dt className="text-sm text-fg-muted">{note.provisional ? t("Likely cause (provisional)") : t("Diagnosis")}</dt><dd className="font-semibold">{note.diagnosis}</dd></div>
              {note.followUpDate ? <div><dt className="text-sm text-fg-muted">{t("Follow up by")}</dt><dd className="font-semibold">{fmt.date(note.followUpDate)}</dd></div> : null}
              {note.advice ? <div className="sm:col-span-2"><dt className="text-sm text-fg-muted">{t("What to do")}</dt><dd>{note.advice}</dd></div> : null}
              {note.investigations.length ? <div className="sm:col-span-2"><dt className="text-sm text-fg-muted">{t("Tests")}</dt><dd>{note.investigations.join(", ")}</dd></div> : null}
            </dl>
          ) : null}
          {note?.warningSigns ? (
            <Alert tone="danger" title={t("Get help urgently if")}>{note.warningSigns} {t("In an emergency, go to the nearest hospital or call your local emergency number.")}</Alert>
          ) : null}
          {ctx.locale !== "en" ? <p className="text-sm text-fg-muted">{t("The doctor wrote this in English. Medicine timings below are shown in your language.")}</p> : null}
        </section>
      ) : null}

      {records.prescriptions.length ? (
        <section className="card space-y-4 p-5" aria-labelledby="rx">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="rx" className="flex items-center gap-2 text-xl font-bold"><Pill className="size-5 text-primary" aria-hidden />{t("Digital prescription")}</h2>
            <div className="flex gap-2">
              {records.prescriptions.map((p) => (
                <a key={p.id} href={`/api/prescriptions/${p.id}/pdf`} target="_blank" rel="noopener" className="tap inline-flex items-center gap-2 rounded-xl border border-field px-3 font-semibold"><Download className="size-4" aria-hidden />{t("PDF")} {p.number}</a>
              ))}
            </div>
          </div>
          <ul className="space-y-2">
            {records.prescriptions.flatMap((p) => p.items).map((it) => (
              <li key={it.id} className="rounded-xl border border-line p-3">
                <p className="font-semibold">{it.name} {it.strength} <span className="font-normal text-fg-muted">({it.form})</span></p>
                <p>{it.dose} · {t(FREQUENCIES[it.frequency]?.label ?? it.frequency)}{TIMINGS[it.timing] ? `, ${t(TIMINGS[it.timing]!)}` : ""} · {t("{n} days", { n: it.durationDays })}</p>
                {it.instructions ? <p className="text-sm text-fg-muted">{it.instructions}</p> : null}
              </li>
            ))}
          </ul>
          {user!.countryCode !== "IN" ? <p className="text-sm text-fg-muted">{t("Your doctor is registered in India. If you live outside India, a prescription from an Indian doctor may not be accepted by pharmacies in your country. Your doctor will give you a written treatment plan that you can share with your local doctor.")}</p> : null}
        </section>
      ) : null}

      {completed ? (
        <section id="next-steps" className="card space-y-4 p-5" aria-labelledby="next">
          <h2 id="next" className="text-xl font-bold">{t("Next steps")}</h2>
          {inPerson ? (
            <div className="rounded-xl border border-accent bg-accent-soft p-4">
              <p className="flex items-center gap-2 font-bold"><Building2 className="size-5" aria-hidden />{t("The doctor recommends a clinic visit")}</p>
              <p className="text-[0.9375rem]">{(inPerson.details as { reason?: string }).reason}</p>
              {inPerson.status === "booked" && inPerson.bookedAppointmentId ? (
                <ButtonLink href={`/consults/${inPerson.bookedAppointmentId}`} variant="secondary" className="mt-2">{t("View your clinic visit")}</ButtonLink>
              ) : (
                <ButtonLink href={`/consults/${a.id}/clinic-visit`} className="mt-2">{t("Book clinic visit in one tap")}</ButtonLink>
              )}
            </div>
          ) : null}
          {actions.filter((x) => x.type !== "in_person_visit").map((x) => (
            <p key={x.id} className="flex items-start gap-2">
              <AlertTriangle className="mt-1 size-4 text-warning" aria-hidden />
              {x.type === "tests" ? t("Tests ordered: {tests}", { tests: ((x.details as { tests?: string[] }).tests ?? []).join(", ") }) : x.type === "specialist_referral" ? t("Referral to a specialist: {reason}", { reason: (x.details as { reason?: string }).reason ?? "" }) : x.type === "follow_up" ? (x.dueBy ? t("Follow up recommended by {date}", { date: fmt.date(x.dueBy) }) : t("Follow up recommended")) : t("Emergency care advised")}
            </p>
          ))}
          <div className="flex flex-wrap gap-2">
            {rx ? <PartnerOrder apptId={a.id} kind="pharmacy" prescriptionId={rx.id} defaultAddress={""} /> : null}
            {note?.investigations.length ? <PartnerOrder apptId={a.id} kind="lab" prescriptionId={null} defaultAddress={""} /> : null}
            <ButtonLink href={`/book/${row.doctorSlug}?type=follow_up`} variant="outline"><CalendarPlus className="size-5" aria-hidden />{t("Book a follow up")}</ButtonLink>
          </div>
          {orders.length ? (
            <ul className="text-sm text-fg-muted">
              {orders.map((o) => <li key={o.id}>{o.kind === "pharmacy" ? t("Medicine order") : t("Lab booking")} {o.externalRef} <Badge>{t(o.status)}</Badge></li>)}
            </ul>
          ) : null}
        </section>
      ) : null}

      {completed ? (
        <section className="space-y-2" aria-labelledby="chat">
          <h2 id="chat" className="flex items-center gap-2 text-xl font-bold"><MessageSquare className="size-5 text-primary" aria-hidden />{t("Messages with the doctor")}</h2>
          <FollowUpChat
            apptId={a.id}
            open={chatOpen}
            closedText={a.followUpChatUntil ? t("The follow up chat closed on {date}. Book a follow up consultation to ask more.", { date: fmt.date(a.followUpChatUntil) }) : t("Chat is closed.")}
            initial={chat.map((m) => ({ id: m.id, senderRole: m.senderRole, senderName: m.senderName, body: m.body, documentId: m.documentId, kind: m.kind, createdAt: m.createdAt.toISOString(), mine: m.senderUserId === user!.id }))}
          />
          {chatOpen ? <p className="text-sm text-fg-muted">{t("Open until {date}.", { date: fmt.dateTime(a.followUpChatUntil!) })}</p> : null}
        </section>
      ) : null}

      {completed ? (
        <section className="card space-y-3 p-5" aria-labelledby="rev">
          <h2 id="rev" className="text-lg font-bold">{t("Your review")}</h2>
          {review ? (
            <p>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)} {review.text}</p>
          ) : (
            <ReviewForm apptId={a.id} doctorName={row.doctorName} />
          )}
        </section>
      ) : null}

      {docs.length ? (
        <section className="card space-y-2 p-5">
          <h2 className="text-lg font-bold">{t("Files for this consult")}</h2>
          <ul className="space-y-1">
            {docs.map((d) => <li key={d.id}><a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="flex items-center gap-2 text-primary hover:underline"><FileText className="size-4" aria-hidden />{d.title}</a></li>)}
          </ul>
        </section>
      ) : null}

      {payment ? (
        <section className="card space-y-2 p-5" aria-labelledby="pay">
          <h2 id="pay" className="flex items-center gap-2 text-lg font-bold"><Receipt className="size-5 text-primary" aria-hidden />{t("Payment")}</h2>
          <p>{fmt.money(payment.amountMinor, payment.currency)} · {t(payment.status)}{payment.method ? ` · ${payment.method.toUpperCase()}` : ""}</p>
          {refundRows.map((r) => <p key={r.id} className="text-success">{t("Refunded {amount} on {date} ({status})", { amount: fmt.money(r.amountMinor, r.currency), date: fmt.date(r.createdAt), status: t(r.status) })}</p>)}
          {payment.invoiceNumber ? <a href={`/api/invoices/${payment.id}`} target="_blank" rel="noopener" className="tap inline-flex items-center gap-2 font-semibold text-primary"><Download className="size-4" aria-hidden />{t("Invoice {n}", { n: payment.invoiceNumber })}</a> : null}
          {completed ? <a href={`/api/consults/${a.id}/claims-pack`} className="tap inline-flex items-center gap-2 font-semibold text-primary"><Download className="size-4" aria-hidden />{t("Insurance claim pack: invoice, prescription and summary")}</a> : null}
        </section>
      ) : null}

      <p className="text-sm text-fg-muted">{t("Something wrong with this consultation?")} <Link href={`/help/contact?ref=${a.ref}`} className="text-primary underline">{t("Tell us")}</Link></p>
    </div>
  );
}
