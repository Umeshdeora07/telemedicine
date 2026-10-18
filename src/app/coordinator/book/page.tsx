import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { getDb } from "@/db";
import { getViewContext } from "@/server/context";
import { findPatients, patientWithOwner } from "@/server/coordinator";
import { getOpenSlots, listDoctors } from "@/server/doctors";
import { getSpecialties } from "@/server/queries/reference";
import { resolveLocation } from "@/server/location";
import { SPOKEN_LANGUAGES } from "@/config/languages";
import { PageHeader } from "@/components/ui/page-header";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stepper } from "@/components/ui/stepper";
import { AssistedBookingForm } from "@/components/coordinator/coordinator-tools";
import { maskPhone } from "@/lib/utils";
import { dayInZone } from "@/lib/time";

export const metadata: Metadata = { title: "Book for a patient" };

type SP = { q?: string; p?: string; m?: string; s?: string; d?: string };

export default async function AssistedBooking({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const qs = (extra: Partial<SP>) => "?" + new URLSearchParams(Object.entries({ ...sp, ...extra }).filter(([, v]) => v) as [string, string][]).toString();

  const found = sp.q ? await findPatients(sp.q) : [];
  const patient = sp.p ? await patientWithOwner(sp.p) : null;
  const specs = await getSpecialties();
  const mode = (sp.m ?? "video") as "video" | "audio" | "chat" | "in_clinic";
  const doctorsList = patient ? await listDoctors(resolveLocation(), { specialty: sp.s || undefined, mode: mode === "in_clinic" ? "in_clinic" : "online", sort: "soonest", limit: 30 }) : [];
  const doctor = sp.d ? doctorsList.find((d) => d.id === sp.d) ?? null : null;
  const slots = doctor ? await getOpenSlots(await getDb(), doctor.id, mode === "in_clinic" ? "in_clinic" : "online", { days: 7 }) : [];
  const tz = patient?.timeZone ?? "Asia/Kolkata";
  const step = !patient ? 0 : !doctor ? 1 : 2;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title={t("Book for a patient")} description={t("For patients who call for help. The booking goes into the patient's own account and they pay with the link we send them.")} />
      <Stepper steps={[t("Find patient"), t("Choose doctor"), t("Time and confirm")]} current={step + 1} total={3} label={t("Step {n} of 3", { n: step + 1 })} />

      <section className="card space-y-4 p-5" aria-labelledby="find">
        <h2 id="find" className="text-lg font-bold">{t("1. Find the patient")}</h2>
        {patient ? (
          <div className="flex flex-wrap items-center gap-2">
            <strong>{patient.p.fullName}</strong>
            <span className="text-fg-muted">{t("account of {name}", { name: patient.ownerName })} · {maskPhone(patient.ownerPhone)} · {patient.currency}</span>
            <Link href="/coordinator/book" className="ms-auto text-primary underline">{t("Change")}</Link>
          </div>
        ) : (
          <>
            <form className="flex flex-wrap items-end gap-2" role="search">
              <Field label={t("Phone, email or name")} htmlFor="q" className="min-w-0 flex-1">
                <Input id="q" name="q" defaultValue={sp.q} inputMode="search" autoComplete="off" />
              </Field>
              <Button type="submit"><Search className="size-5" aria-hidden />{t("Search")}</Button>
            </form>
            {sp.q ? (
              found.length ? (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {found.map((f) => (
                    <li key={f.p.id}>
                      <Link href={qs({ p: f.p.id, q: undefined })} className="flex flex-wrap items-center gap-2 p-3 hover:bg-surface-2">
                        <strong>{f.p.fullName}</strong>
                        <span className="text-sm text-fg-muted">{f.p.userId === f.ownerId ? t("own account") : t("in {name}'s account", { name: f.ownerName })} · {maskPhone(f.ownerPhone)}</span>
                        <Badge className="ms-auto">{f.country}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-fg-muted">{t("No patient found. Ask them to sign up with their phone number first (it takes a minute), then search again.")}</p>
            ) : null}
          </>
        )}
      </section>

      {patient ? (
        <section className="card space-y-4 p-5" aria-labelledby="doc">
          <h2 id="doc" className="text-lg font-bold">{t("2. Choose the doctor")}</h2>
          <form className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="p" value={patient.p.id} />
            <Field label={t("Consult type")} htmlFor="m">
              <Select id="m" name="m" defaultValue={mode}>
                <option value="video">{t("Video")}</option>
                <option value="audio">{t("Audio")}</option>
                <option value="chat">{t("Chat")}</option>
                <option value="in_clinic">{t("In clinic (India)")}</option>
              </Select>
            </Field>
            <Field label={t("Specialty")} htmlFor="s">
              <Select id="s" name="s" defaultValue={sp.s ?? ""}>
                <option value="">{t("Any")}</option>
                {specs.map((s) => <option key={s.slug} value={s.slug}>{t(s.name)}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-3"><Button type="submit" variant="secondary">{t("Show doctors")}</Button></div>
          </form>
          <p className="text-sm text-fg-muted">{t("Every doctor shown is verified and registered in India.")}</p>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {doctorsList.map((d) => (
              <li key={d.id}>
                <Link href={qs({ d: d.id, m: mode })} aria-current={d.id === doctor?.id ? "true" : undefined} className="flex flex-wrap items-center gap-2 p-3 hover:bg-surface-2 aria-[current=true]:bg-primary-soft">
                  <strong>{d.fullName}</strong>
                  <span className="text-sm text-fg-muted">{t(d.specialtyName)} · {d.languages.map((l) => t(SPOKEN_LANGUAGES[l as keyof typeof SPOKEN_LANGUAGES] ?? l)).join(", ")}</span>
                  <span className="ms-auto text-sm">{(mode === "in_clinic" ? d.nextClinic : d.nextOnline) ? t("Next: {time}", { time: fmt.dateTime((mode === "in_clinic" ? d.nextClinic : d.nextOnline)!, tz) }) : t("No slots")}</span>
                </Link>
              </li>
            ))}
            {!doctorsList.length ? <li className="p-3 text-fg-muted">{t("No doctors match this choice. Try another specialty or consult type.")}</li> : null}
          </ul>
        </section>
      ) : null}

      {patient && doctor ? (
        <section className="card space-y-4 p-5" aria-labelledby="time">
          <h2 id="time" className="text-lg font-bold">{t("3. Time with {doctor}", { doctor: doctor.fullName })}</h2>
          <p className="text-sm text-fg-muted">{t("Times shown in the patient's time zone ({zone}).", { zone: fmt.zone(tz) })}</p>
          <AssistedBookingForm
            hidden={{ patientId: patient.p.id, doctorId: doctor.id, mode }}
            slots={slots.slice(0, 60).map((s) => ({ id: s.id, label: fmt.time(s.startAt, tz), day: fmt.date(`${dayInZone(s.startAt, tz)}T12:00:00Z`, "UTC", { weekday: "long", day: "numeric", month: "short" }) }))}
            languages={Object.entries(SPOKEN_LANGUAGES).map(([code, name]) => ({ code, name }))}
          />
        </section>
      ) : null}
    </div>
  );
}
