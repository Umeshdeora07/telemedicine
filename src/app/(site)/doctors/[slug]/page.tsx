import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import {
  Award,
  BadgeCheck,
  BookOpen,
  Building2,
  Clock,
  GraduationCap,
  Languages,
  MapPin,
  MessageSquare,
  Phone,
  PlayCircle,
  Star,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";
import { getViewContext } from "@/server/context";
import { getDoctorProfile, getOpenSlots, isDoctorVisible } from "@/server/doctors";
import { describeLocation, locationParam, resolveLocation } from "@/server/location";
import { getDb } from "@/db";
import { appointments, patients, savedDoctors } from "@/db/schema";
import { brand } from "@/config/brand";
import { languageName } from "@/config/languages";
import { DoctorAvatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { LazyMap } from "@/components/map/lazy-map";
import { JsonLd } from "@/components/common/json-ld";
import { SaveDoctorButton } from "@/components/doctor/save-doctor-button";
import { dayInZone } from "@/lib/time";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getDoctorProfile(slug);
  if (!p) return { title: "Doctor not found" };
  return { title: `${p.doctor.fullName}, ${p.specialty.name}`, description: p.doctor.headline || p.doctor.about.slice(0, 150) };
}

const MODE_ICON = { video: Video, audio: Phone, chat: MessageSquare, in_clinic: Building2 } as const;

export default async function DoctorProfilePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ for?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = await getDoctorProfile(slug);
  if (!p) notFound();
  const ctx = await getViewContext();
  const { t, fmt, tz } = ctx;
  const d = p.doctor;
  const db = await getDb();
  const loc = resolveLocation(sp.for, ctx.declared, ctx.user);
  const place = await describeLocation(loc);
  const canConsultOnline = await isDoctorVisible(db, d.id, loc);
  const canClinic = d.modes.includes("in_clinic") && (await isDoctorVisible(db, d.id, { country: "IN", region: null }));
  const [onlineSlots, clinicSlots] = await Promise.all([
    canConsultOnline ? getOpenSlots(db, d.id, "online", { days: 7 }) : Promise.resolve([]),
    canClinic ? getOpenSlots(db, d.id, "in_clinic", { days: 14 }) : Promise.resolve([]),
  ]);
  const onlineModes = d.modes.filter((m) => m !== "in_clinic");
  const saved = ctx.user ? (await db.select().from(savedDoctors).where(and(eq(savedDoctors.userId, ctx.user.id), eq(savedDoctors.doctorId, d.id)))).length > 0 : false;
  const [lastConsult] = ctx.user
    ? await db
        .select({ startAt: appointments.startAt, patientName: patients.fullName })
        .from(appointments)
        .innerJoin(patients, eq(patients.id, appointments.patientId))
        .where(and(eq(appointments.doctorId, d.id), eq(appointments.bookedByUserId, ctx.user.id), eq(appointments.status, "completed")))
        .orderBy(desc(appointments.startAt))
        .limit(1)
    : [];

  // Group the next online slots by day (in the viewer's time zone).
  const byDay = new Map<string, typeof onlineSlots>();
  for (const s of onlineSlots) {
    const k = dayInZone(s.startAt, tz);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(s);
  }
  const days = [...byDay.entries()].slice(0, 3);
  const forQ = `for=${locationParam(loc)}`;
  const firstFee = onlineModes[0] ? ctx.priceFor(p.fees, onlineModes[0]) : null;
  const inIndia = p.licences.find((l) => l.country === "IN");

  return (
    <div className="container-page py-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Physician",
          name: d.fullName,
          medicalSpecialty: p.specialty.name,
          knowsLanguage: d.languages,
          aggregateRating: Number(d.ratingCount) > 0 ? { "@type": "AggregateRating", ratingValue: Number(d.ratingAvg), reviewCount: d.ratingCount } : undefined,
          hospitalAffiliation: p.clinics.map((c) => ({ "@type": "Hospital", name: c.clinic.name, address: `${c.clinic.addressLine}, ${c.clinic.city}` })),
        }}
      />
      <nav aria-label={t("Breadcrumb")} className="mb-4 text-sm text-fg-muted">
        <Link href="/doctors" className="hover:underline">{t("Doctors")}</Link> ›{" "}
        <Link href={`/specialties/${p.specialty.slug}`} className="hover:underline">{t(p.specialty.name)}</Link> › <span aria-current="page">{d.fullName}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          {/* Header card */}
          <section className="card p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row">
              <DoctorAvatar name={d.fullName} seed={d.avatarSeed} gender={d.gender} photoUrl={d.photoUrl} size={112} senior={d.experienceYears >= 20} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-2xl font-extrabold sm:text-3xl">{d.fullName}</h1>
                  {ctx.user ? <SaveDoctorButton doctorId={d.id} saved={saved} /> : null}
                </div>
                <p className="text-lg text-fg-muted">
                  {t(p.specialty.name)}
                  {d.subSpecialties.length ? ` · ${d.subSpecialties.map((s) => t(s)).join(", ")}` : ""}
                </p>
                <p className="font-medium">{d.headline}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <VerifiedBadge label={t("Verified by {brand}", { brand: brand.name })} />
                  {d.lastVerifiedAt ? <span className="text-sm text-fg-muted">{t("Last checked {date}", { date: fmt.date(d.lastVerifiedAt) })}</span> : null}
                </div>
                <ul className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1 text-[0.9375rem]">
                  <li className="flex items-center gap-1.5"><Star className="size-4 fill-accent text-accent" aria-hidden />{Number(d.ratingCount) ? <><strong>{Number(d.ratingAvg).toFixed(1)}</strong> <span className="text-fg-muted">({t("{n} reviews", { n: d.ratingCount })})</span></> : t("New doctor")}</li>
                  <li className="flex items-center gap-1.5"><Stethoscope className="size-4 text-fg-muted" aria-hidden />{t("{n} years experience", { n: d.experienceYears })}</li>
                  <li className="flex items-center gap-1.5"><Users className="size-4 text-fg-muted" aria-hidden />{t("{n}+ consults", { n: Math.floor(d.consultCount / 50) * 50 || d.consultCount })}</li>
                  <li className="flex items-center gap-1.5"><Languages className="size-4 text-fg-muted" aria-hidden />{d.languages.map((l) => t(languageName(l))).join(", ")}</li>
                  <li className="text-fg-muted">{d.gender === "female" ? t("Woman doctor") : t("Man doctor")}</li>
                </ul>
              </div>
            </div>
            {d.videoIntroUrl ? (
              <details className="mt-4 rounded-xl border border-line p-3">
                <summary className="tap flex cursor-pointer list-none items-center gap-2 font-semibold text-primary">
                  <PlayCircle className="size-5" aria-hidden />
                  {t("Watch a short introduction")}
                </summary>
                <p className="mt-2 text-sm text-fg-muted">{t("Video introductions are recorded by the doctor and include captions. (Demo: placeholder.)")}</p>
              </details>
            ) : null}
          </section>

          {lastConsult ? (
            <Alert tone="info" title={t("See the same doctor again")}>
              {t("{patient} consulted {doctor} on {date}. Book a follow-up to keep your care in one place.", { patient: lastConsult.patientName, doctor: d.fullName, date: fmt.date(lastConsult.startAt) })}{" "}
              <Link href={`/book/${d.slug}?type=follow_up&${forQ}`} className="font-semibold text-primary underline">{t("Book follow-up")}</Link>
            </Alert>
          ) : null}

          {!canConsultOnline && onlineModes.length ? (
            <Alert tone="warning" title={t("{name} can't consult patients in {place}", { name: d.fullName, place: place.label })}>
              {t("Doctors may only treat patients where they hold a licence. If the patient is in India, change the location to India.")}{" "}
              <Link href={`/doctors/${d.slug}?for=IN`} className="font-semibold text-primary underline">{t("Patient is in India")}</Link>
            </Alert>
          ) : null}

          {/* About */}
          <section className="card space-y-3 p-5 sm:p-6" aria-labelledby="about">
            <h2 id="about" className="text-xl font-bold">{t("About")}</h2>
            <p className="text-[1.0625rem]">{d.about}</p>
            {d.conditionsTreated.length ? (
              <div>
                <h3 className="mb-2 font-semibold">{t("Conditions treated")}</h3>
                <ul className="flex flex-wrap gap-2">{d.conditionsTreated.map((c) => <li key={c}><Badge>{t(c)}</Badge></li>)}</ul>
              </div>
            ) : null}
            {d.procedures.length ? (
              <div>
                <h3 className="mb-2 font-semibold">{t("Procedures")}</h3>
                <ul className="flex flex-wrap gap-2">{d.procedures.map((c) => <li key={c}><Badge>{t(c)}</Badge></li>)}</ul>
              </div>
            ) : null}
          </section>

          {/* Qualifications & registration */}
          <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="quals">
            <h2 id="quals" className="text-xl font-bold">{t("Qualifications and registration")}</h2>
            <ul className="space-y-3">
              {p.quals.map((q) => (
                <li key={q.id} className="flex gap-3">
                  <GraduationCap className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <span><strong>{q.degree}</strong> — {q.institution}, {q.year}</span>
                </li>
              ))}
            </ul>
            <div>
              <h3 className="mb-2 font-semibold">{t("Licences to practise")}</h3>
              <ul className="space-y-2">
                {p.licences.map((l) => (
                  <li key={l.id} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{l.issuingBody}</span>
                      <VerifiedBadge label={t("Verified")} />
                    </div>
                    <p className="text-[0.9375rem] text-fg-muted">
                      {t("Registration no.")} <span className="font-mono text-fg">{l.number}</span> · {l.region ? `${l.region}, ` : ""}{l.country}
                      {l.verifiedAt ? ` · ${t("checked {date}", { date: fmt.date(l.verifiedAt) })}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
              {inIndia ? <p className="mt-2 text-sm text-fg-muted">{t("You can check an Indian registration on the National Medical Commission's Indian Medical Register.")}</p> : null}
            </div>
            {d.pastPositions.length ? (
              <div>
                <h3 className="mb-2 font-semibold">{t("Experience")}</h3>
                <ul className="space-y-1.5">
                  {d.pastPositions.map((pp) => (
                    <li key={pp.title + pp.place}>{pp.title}, {pp.place}{pp.from ? ` (${pp.from}–${pp.to ?? t("present")})` : ""}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {d.awards.length || d.memberships.length || d.publications.length ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {d.awards.length ? (
                  <div>
                    <h3 className="mb-1 flex items-center gap-1.5 font-semibold"><Award className="size-4 text-accent" aria-hidden />{t("Awards")}</h3>
                    <ul className="text-[0.9375rem] text-fg-muted">{d.awards.map((a) => <li key={a.title}>{a.title}{a.year ? `, ${a.year}` : ""}</li>)}</ul>
                  </div>
                ) : null}
                {d.memberships.length ? (
                  <div>
                    <h3 className="mb-1 font-semibold">{t("Memberships")}</h3>
                    <ul className="text-[0.9375rem] text-fg-muted">{d.memberships.map((m) => <li key={m}>{m}</li>)}</ul>
                  </div>
                ) : null}
                {d.publications.length ? (
                  <div>
                    <h3 className="mb-1 flex items-center gap-1.5 font-semibold"><BookOpen className="size-4" aria-hidden />{t("Publications")}</h3>
                    <ul className="text-[0.9375rem] text-fg-muted">{d.publications.map((m) => <li key={m}>{m}</li>)}</ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* Clinics */}
          {p.clinics.length ? (
            <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="clinics">
              <h2 id="clinics" className="text-xl font-bold">{t("Clinic for in-person visits")}</h2>
              {p.clinics.map(({ clinic: c, link }) => (
                <div key={c.id} className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/hospitals/${c.slug}`} className="text-lg font-semibold text-primary hover:underline">{c.name}</Link>
                      <p className="flex items-start gap-1.5 text-fg-muted"><MapPin className="mt-1 size-4 shrink-0" aria-hidden />{c.addressLine}, {c.city}, {c.state} {c.postcode}</p>
                      <p className="text-sm text-fg-muted">{c.timings.map((x) => `${x.day}: ${x.open}${x.close !== x.open ? `–${x.close}` : ""}`).join(" · ")}</p>
                    </div>
                    {link.inClinicFeeMinor ? (
                      <p className="text-end">
                        <span className="block text-lg font-bold">{ctx.priceFor(p.fees, "in_clinic")?.label}</span>
                        <span className="text-sm text-fg-muted">{t("per clinic visit")}</span>
                      </p>
                    ) : null}
                  </div>
                  {c.lat && c.lng ? <LazyMap points={[{ lat: c.lat, lng: c.lng, title: c.name, subtitle: c.city }]} height={220} label={t("Map showing {name}", { name: c.name })} /> : null}
                  <div className="flex flex-wrap gap-2">
                    {c.photos.map((ph) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={ph.url} src={ph.url} alt={ph.alt} width={160} height={100} loading="lazy" className="h-24 w-40 rounded-lg border border-line object-cover" />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {/* Reviews */}
          <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="reviews">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id="reviews" className="text-xl font-bold">{t("Patient reviews")}</h2>
              <p className="text-sm text-fg-muted">{t("Only patients who completed a consult can review.")}</p>
            </div>
            {p.reviews.length ? (
              <ul className="divide-y divide-line">
                {p.reviews.map((r) => (
                  <li key={r.id} className="space-y-2 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{r.authorDisplayName}</span>
                      <span className="text-sm text-fg-muted">{fmt.date(r.createdAt)}</span>
                    </div>
                    <p className="flex items-center gap-0.5" aria-label={t("{n} out of 5 stars", { n: r.rating })}>
                      {Array.from({ length: 5 }, (_, i) => <Star key={i} className={i < r.rating ? "size-4 fill-accent text-accent" : "size-4 text-line"} aria-hidden />)}
                      <Badge tone="success" className="ms-2 text-xs">{t("Verified consult")}</Badge>
                    </p>
                    {r.text ? <p>{r.text}</p> : null}
                    {r.doctorReply ? (
                      <div className="rounded-xl bg-surface-2 p-3 text-[0.9375rem]">
                        <p className="font-semibold">{t("Reply from {name}", { name: d.fullName })}</p>
                        <p>{r.doctorReply}</p>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-fg-muted">{t("No reviews yet.")}</p>
            )}
          </section>
        </div>

        {/* Booking sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label={t("Book a consult")}>
          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-bold">{t("Consult options")}</h2>
            <ul className="space-y-2">
              {d.modes.map((m) => {
                const price = ctx.priceFor(p.fees, m);
                const Icon = MODE_ICON[m];
                const label = { video: t("Video consult"), audio: t("Audio call"), chat: t("Chat"), in_clinic: t("Clinic visit") }[m];
                return (
                  <li key={m} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                    <span className="flex items-center gap-2"><Icon className="size-5 text-primary" aria-hidden />{label}</span>
                    <span className="font-bold">{price?.label}</span>
                  </li>
                );
              })}
            </ul>
            <p className="flex items-center gap-2 text-sm text-fg-muted">
              <Clock className="size-4" aria-hidden />
              {t("{n}-minute consult · replies to chat in about {m} min", { n: d.consultMinutes, m: d.chatResponseMinutes })}
            </p>
            {ctx.currency !== "INR" ? <p className="text-xs text-fg-muted">{t("Converted at the rate of {date}.", { date: ctx.ratesAsOf })}</p> : null}
          </section>

          {canConsultOnline && onlineModes.length ? (
            <section className="card space-y-3 p-5" aria-labelledby="next-slots">
              <h2 id="next-slots" className="text-lg font-bold">{t("Next available")}</h2>
              <p className="text-sm text-fg-muted">{t("Your time ({zone}). Doctor's local time: {tz}.", { zone: fmt.zone(), tz: fmt.zone(d.timeZone) })}</p>
              {days.length ? (
                days.map(([day, slots]) => (
                  <div key={day}>
                    <h3 className="mb-1.5 text-sm font-semibold">{fmt.date(slots[0]!.startAt, tz, { weekday: "long", day: "numeric", month: "short", year: undefined })}</h3>
                    <ul className="flex flex-wrap gap-1.5">
                      {slots.slice(0, 6).map((s) => (
                        <li key={s.id}>
                          <Link href={`/book/${d.slug}?slot=${s.id}&${forQ}`} className="tap inline-flex items-center rounded-lg border border-field px-3 text-sm font-medium hover:border-primary hover:bg-primary-soft">
                            {fmt.time(s.startAt)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="text-fg-muted">{t("No online slots this week.")}</p>
              )}
              <ButtonLink href={`/book/${d.slug}?${forQ}`} size="lg" className="w-full">
                <Video className="size-5" aria-hidden />
                {firstFee ? t("Consult · {price}", { price: firstFee.label }) : t("Consult")}
              </ButtonLink>
            </section>
          ) : null}
          {canClinic ? (
            <section className="card space-y-3 p-5">
              <h2 className="text-lg font-bold">{t("Clinic visit")}</h2>
              <p className="text-fg-muted">
                {clinicSlots[0] ? t("Next clinic slot: {when}", { when: fmt.dateTime(clinicSlots[0].startAt) }) : t("No clinic slots in the next 2 weeks.")}
              </p>
              <ButtonLink href={`/book/${d.slug}?mode=in_clinic`} variant="outline" className="w-full">
                <Building2 className="size-5" aria-hidden />
                {t("Book clinic visit")}
              </ButtonLink>
            </section>
          ) : null}
          <p className="flex items-start gap-2 px-1 text-sm text-fg-muted">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {t("Full refund if the doctor doesn't join within 10 minutes.")}
          </p>
        </aside>
      </div>

      {/* Sticky mobile CTA */}
      {canConsultOnline && onlineModes.length ? (
        <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 p-3 backdrop-blur md:hidden">
          <ButtonLink href={`/book/${d.slug}?${forQ}`} size="lg" className="w-full">
            {firstFee ? t("Consult · {price}", { price: firstFee.label }) : t("Consult")}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
