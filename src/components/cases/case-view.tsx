import { and, eq } from "drizzle-orm";
import { CheckCircle2, Circle, FileText, Plane, Receipt } from "lucide-react";
import { getDb } from "@/db";
import { clinics, doctorClinicLinks, doctors } from "@/db/schema";
import type { getCase } from "@/server/cases";
import { CASE_STEPS } from "@/server/cases";
import { getCountries, getRate } from "@/server/queries/reference";
import type { getViewContext } from "@/server/context";
import { SPOKEN_LANGUAGES } from "@/config/languages";
import type { Currency } from "@/config/currencies";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { cn, humanize } from "@/lib/utils";
import { AssignForm, CaseChat, EstimateForm, EstimateResponse, PayDeposit, StatusForm, TravelForm, VisaLetterForm } from "./case-forms";

type Data = NonNullable<Awaited<ReturnType<typeof getCase>>>;
type Ctx = Awaited<ReturnType<typeof getViewContext>>;

export function CaseTimeline({ data, ctx }: { data: Data; ctx: Ctx }) {
  const { t, fmt } = ctx;
  const idx = CASE_STEPS.findIndex((s) => s.status === data.c.status);
  return (
    <ol className="space-y-0" aria-label={t("Case progress")}>
      {CASE_STEPS.map((s, i) => {
        const ev = [...data.events].reverse().find((e) => e.status === s.status);
        const done = i <= idx;
        return (
          <li key={s.status} className="relative flex gap-3 pb-4 last:pb-0">
            {i < CASE_STEPS.length - 1 ? <span className={cn("absolute start-[11px] top-6 h-full w-0.5", i < idx ? "bg-primary" : "bg-line")} aria-hidden /> : null}
            {done ? <CheckCircle2 className="relative size-6 shrink-0 bg-surface text-primary" aria-hidden /> : <Circle className="relative size-6 shrink-0 bg-surface text-line" aria-hidden />}
            <div className="min-w-0">
              <p className={cn("font-semibold", !done && "text-fg-muted", i === idx && "text-primary")}>
                {t(s.label)} {i === idx ? <span className="sr-only">({t("current step")})</span> : null}
              </p>
              {ev ? <p className="text-sm text-fg-muted">{fmt.date(ev.createdAt)} · {ev.note}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function EstimateCard({ e, ctx, data }: { e: Data["estimates"][number]; ctx: Ctx; data: Data }) {
  const { t, fmt } = ctx;
  const intl = e.currency !== "INR";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold">{e.recommendedTreatment}</h3>
        <Badge tone={e.status === "accepted" ? "success" : e.status === "declined" ? "danger" : e.status === "superseded" ? "neutral" : "warning"}>{t(humanize(e.status))}</Badge>
      </div>
      {e.rationale ? <p>{e.rationale}</p> : null}
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-surface-2 p-3">
          <dt className="text-sm text-fg-muted">{t("Estimated cost")}</dt>
          <dd className="text-xl font-extrabold text-heading">{fmt.money(e.costMinMinor, e.currency)} – {fmt.money(e.costMaxMinor, e.currency)}</dd>
          {intl ? <dd className="text-sm text-fg-muted">{fmt.money(e.costMinInrMinor, "INR")} – {fmt.money(e.costMaxInrMinor, "INR")}</dd> : null}
        </div>
        <div className="rounded-xl bg-surface-2 p-3"><dt className="text-sm text-fg-muted">{t("In hospital")}</dt><dd className="text-xl font-extrabold text-heading">{t("{n} days", { n: e.hospitalDays })}</dd></div>
        <div className="rounded-xl bg-surface-2 p-3"><dt className="text-sm text-fg-muted">{t("Total time in India")}</dt><dd className="text-xl font-extrabold text-heading">{t("{n} days", { n: e.indiaDays })}</dd></div>
      </dl>
      {intl ? <p className="text-sm text-fg-muted">{t("Converted at 1 INR = {rate} {cur} on {date}. The hospital bills in rupees; your card or bank sets the final exchange rate.", { rate: e.fxRate.toFixed(4), cur: e.currency, date: fmt.date(e.fxAsOf) })}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {e.inclusions.length ? <div><h4 className="font-semibold">{t("Included")}</h4><ul className="list-disc ps-5">{e.inclusions.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
        {e.exclusions.length ? <div><h4 className="font-semibold">{t("Not included")}</h4><ul className="list-disc ps-5">{e.exclusions.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
      </div>
      {e.documentsNeeded.length ? <div><h4 className="font-semibold">{t("Documents to bring")}</h4><ul className="list-disc ps-5">{e.documentsNeeded.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
      <p className="text-sm text-fg-muted">
        {e.depositMinor ? t("Deposit to confirm: {amount}. ", { amount: fmt.money(e.depositMinor, e.currency) }) : ""}
        {t("Valid until {date}.", { date: fmt.date(e.validUntil) })}
      </p>
      {data.access === "patient" && e.status === "sent" ? <EstimateResponse estimateId={e.id} caseId={data.c.id} /> : null}
    </div>
  );
}

export async function CaseView({ data, ctx }: { data: Data; ctx: Ctx }) {
  const { t, fmt, user } = ctx;
  const { c } = data;
  const staff = data.access === "clinic" || data.access === "coordinator";
  const current = data.estimates.find((e) => e.status === "sent" || e.status === "accepted");
  const countries = await getCountries();
  const countryName = countries.find((x) => x.code === c.homeCountry)?.name ?? c.homeCountry;
  const depositPaid = data.payments.some((p) => p.purpose === "case_deposit" && p.status === "captured");
  const languages = Object.entries(SPOKEN_LANGUAGES).map(([code, name]) => ({ code, name }));

  let staffBits: React.ReactNode = null;
  if (staff) {
    const db = await getDb();
    const clinicList = await db.select({ id: clinics.id, name: clinics.name }).from(clinics).where(eq(clinics.acceptsInternational, true));
    const clinicId = c.assignedClinicId ?? c.preferredClinicId;
    const docList = clinicId
      ? await db.select({ id: doctors.id, name: doctors.fullName }).from(doctorClinicLinks).innerJoin(doctors, eq(doctors.id, doctorClinicLinks.doctorId)).where(and(eq(doctorClinicLinks.clinicId, clinicId), eq(doctorClinicLinks.active, true)))
      : [];
    const { rate } = await getRate(c.currency as Currency);
    staffBits = (
      <>
        <section className="card space-y-4 p-5" aria-labelledby="assign">
          <h2 id="assign" className="text-lg font-bold">{t("Hospital and reviewing doctor")}</h2>
          <AssignForm caseId={c.id} clinics={data.access === "clinic" ? clinicList.filter((x) => x.id === clinicId) : clinicList} doctors={docList} clinicId={clinicId} doctorId={c.assignedDoctorId} />
        </section>
        {["under_review", "plan_sent", "received"].includes(c.status) ? (
          <section className="card space-y-4 p-5" aria-labelledby="est">
            <h2 id="est" className="text-lg font-bold">{current ? t("Send a revised plan and estimate") : t("Send plan and estimate")}</h2>
            <EstimateForm caseId={c.id} currency={c.currency} rate={rate} doctorId={c.assignedDoctorId} treatment={c.treatmentInterest} />
          </section>
        ) : null}
        {["accepted", "visa_letter_issued", "travel_booked"].includes(c.status) ? (
          <section className="card space-y-4 p-5" aria-labelledby="visa">
            <h2 id="visa" className="text-lg font-bold">{t("Medical visa invitation letter")}</h2>
            <VisaLetterForm caseId={c.id} nationality={countryName} treatment={current?.recommendedTreatment ?? c.treatmentInterest} attendants={c.travel.attendants ?? []} />
          </section>
        ) : null}
        <section className="card space-y-4 p-5" aria-labelledby="status">
          <h2 id="status" className="text-lg font-bold">{t("Progress update")}</h2>
          <StatusForm
            caseId={c.id}
            options={(["under_review", "travel_booked", "arrived", "in_treatment", "discharged", "follow_up", "closed"] as const).map((s) => ({ value: s, label: t(CASE_STEPS.find((x) => x.status === s)!.label) }))}
          />
        </section>
      </>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-6">
        <section className="card space-y-3 p-5" aria-labelledby="summary">
          <h2 id="summary" className="text-lg font-bold">{t("About the case")}</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div><dt className="text-sm text-fg-muted">{t("Patient")}</dt><dd className="font-semibold">{data.patient.fullName}</dd></div>
            <div><dt className="text-sm text-fg-muted">{t("From")}</dt><dd className="font-semibold">{t(countryName)} · {c.currency}</dd></div>
            <div><dt className="text-sm text-fg-muted">{t("Treatment")}</dt><dd className="font-semibold">{c.treatmentInterest}</dd></div>
            <div><dt className="text-sm text-fg-muted">{t("Specialty")}</dt><dd className="font-semibold">{data.specialty ? t(data.specialty.name) : "—"}</dd></div>
            <div><dt className="text-sm text-fg-muted">{t("Hospital")}</dt><dd className="font-semibold">{data.clinic?.name ?? t("Not chosen yet")}</dd></div>
            <div><dt className="text-sm text-fg-muted">{t("Specialist")}</dt><dd className="font-semibold">{data.doctor?.fullName ?? t("Not assigned yet")}</dd></div>
          </dl>
          <p className="whitespace-pre-line rounded-xl bg-surface-2 p-3">{c.description}</p>
        </section>

        {current ? (
          <section className="card space-y-3 p-5" aria-labelledby="plan">
            <h2 id="plan" className="text-lg font-bold">{t("Treatment plan and estimate")}</h2>
            <EstimateCard e={current} ctx={ctx} data={data} />
            {data.access === "patient" && current.status === "accepted" && current.depositMinor > 0 && !depositPaid ? (
              <PayDeposit caseId={c.id} label={t("Pay deposit {amount}", { amount: fmt.money(current.depositMinor, current.currency) })} />
            ) : null}
            {depositPaid ? <Alert tone="success">{t("Deposit received. Your hospital bed and doctor are reserved.")}</Alert> : null}
          </section>
        ) : data.access === "patient" ? (
          <Alert tone="info" title={t("What happens next")}>{t("A coordinator checks your reports within 24 hours, then a specialist writes your plan and cost estimate, usually within 3 working days.")}</Alert>
        ) : null}

        {staffBits}

        <section className="space-y-3" aria-labelledby="msgs">
          <h2 id="msgs" className="text-lg font-bold">{t("Messages")}</h2>
          <CaseChat caseId={c.id} messages={data.thread.map((m) => ({ id: m.id, senderName: m.senderName, senderRole: m.senderRole, body: m.body, createdAt: m.createdAt.toISOString(), mine: m.senderUserId === user!.id }))} />
        </section>

        {data.access !== "doctor" ? (
          <section className="card space-y-4 p-5" aria-labelledby="travel">
            <h2 id="travel" className="flex items-center gap-2 text-lg font-bold"><Plane className="size-5 text-primary" aria-hidden />{t("Travel and stay")}</h2>
            <TravelForm caseId={c.id} travel={c.travel} languages={languages} />
          </section>
        ) : null}
      </div>

      <aside className="space-y-6">
        <section className="card p-5" aria-labelledby="progress">
          <h2 id="progress" className="mb-4 text-lg font-bold">{t("Progress")}</h2>
          <CaseTimeline data={data} ctx={ctx} />
        </section>
        <section className="card space-y-2 p-5" aria-labelledby="docs">
          <h2 id="docs" className="text-lg font-bold">{t("Documents ({n})", { n: data.docs.length })}</h2>
          <ul className="space-y-1.5">
            {data.docs.map((d) => (
              <li key={d.id}>
                <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener" className="flex items-start gap-1.5 text-primary hover:underline">
                  <FileText className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{d.title}{d.category === "visa_letter" ? <Badge tone="success" className="ms-1">{t("Visa letter")}</Badge> : null}</span>
                </a>
              </li>
            ))}
          </ul>
          {data.letters.length ? <p className="text-sm text-fg-muted">{t("Apply for the e-Medical visa at indianvisaonline.gov.in and upload the hospital letter.")}</p> : null}
        </section>
        {data.payments.length ? (
          <section className="card space-y-2 p-5" aria-labelledby="pays">
            <h2 id="pays" className="text-lg font-bold">{t("Payments")}</h2>
            <ul className="space-y-1.5">
              {data.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2">
                  <Receipt className="size-4 text-primary" aria-hidden />
                  {p.purpose === "case_deposit" ? t("Deposit") : t("Hospital bill")} · {fmt.money(p.amountMinor, p.currency)}
                  <Badge tone={p.status === "captured" ? "success" : "neutral"}>{t(humanize(p.status))}</Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {data.coordinator ? (
          <section className="card space-y-1 p-5" aria-labelledby="coord">
            <h2 id="coord" className="text-lg font-bold">{t("Your care coordinator")}</h2>
            <p className="font-semibold">{data.coordinator.name}</p>
            {data.coordinator.phone ? <p><a href={`tel:${data.coordinator.phone}`} className="text-primary underline">{data.coordinator.phone}</a></p> : null}
            {data.coordinator.email ? <p><a href={`mailto:${data.coordinator.email}`} className="text-primary underline">{data.coordinator.email}</a></p> : null}
          </section>
        ) : null}
      </aside>
    </div>
  );
}
