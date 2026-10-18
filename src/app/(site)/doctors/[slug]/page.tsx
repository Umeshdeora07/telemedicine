import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Award, BadgeCheck, BookOpen, Briefcase, Clock, GraduationCap, Languages, MessageSquare, Phone, ShieldCheck, Star, Video } from "lucide-react";
import { getViewContext } from "@/server/context";
import { getDoctorProfile, getOpenSlots } from "@/server/doctors";
import { getDb } from "@/db";
import { appointments, patients } from "@/db/schema";
import { languageName } from "@/config/languages";
import { DoctorAvatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { JsonLd } from "@/components/common/json-ld";
import { SlotPicker } from "@/components/booking/slot-picker";
import { defaultOnlineMode } from "@/components/doctor/doctor-card";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getDoctorProfile(slug);
  if (!p) return { title: "Doctor not found" };
  return {
    title: `${p.doctor.fullName}, ${p.specialty.name}`,
    description: `Book a video consultation with ${p.doctor.fullName}, ${p.specialty.name}. Registered in India and verified by our team.`,
  };
}

const MODES = [
  { mode: "video", Icon: Video, label: "Video consultation" },
  { mode: "audio", Icon: Phone, label: "Audio call" },
  { mode: "chat", Icon: MessageSquare, label: "Chat" },
] as const;

export default async function DoctorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Only doctors who may be booked (approved, re-verified, with a verified Indian registration) have a profile.
  const p = await getDoctorProfile(slug);
  if (!p) notFound();
  const ctx = await getViewContext();
  const { t, tp, fmt } = ctx;
  const d = p.doctor;
  const db = await getDb();
  const mode = defaultOnlineMode(d.modes);
  const [slots, lastConsult] = await Promise.all([
    mode ? getOpenSlots(db, d.id, "online", { days: 14 }) : Promise.resolve([]),
    ctx.user
      ? db
          .select({ startAt: appointments.startAt, patientName: patients.fullName })
          .from(appointments)
          .innerJoin(patients, eq(patients.id, appointments.patientId))
          .where(and(eq(appointments.doctorId, d.id), eq(appointments.bookedByUserId, ctx.user.id), eq(appointments.status, "completed")))
          .orderBy(desc(appointments.startAt))
          .limit(1)
          .then((r) => r[0])
      : Promise.resolve(undefined),
  ]);

  const quals = p.quals.map((q) => q.degree).join(", ");
  const regs = [...p.licences].sort((a, b) => Number(b.country === "IN") - Number(a.country === "IN"));
  const mainReg = regs[0];
  const lastCheck = mainReg?.verifiedAt ?? d.lastVerifiedAt;
  const fee = mode ? ctx.priceFor(p.fees, mode) : null;
  const bookHref = mode ? `/book/${d.slug}?mode=${mode}` : null;
  const bookLabel = mode === "video" ? t("Book video consultation") : t("Book consultation");
  const rated = Number(d.ratingCount) > 0;
  const regions = new Intl.DisplayNames([ctx.intl], { type: "region" });
  const country = (code: string) => {
    if (code === "IN") return t("India");
    try {
      return regions.of(code) ?? code;
    } catch {
      return code;
    }
  };
  const years = (from?: number, to?: number) => (from && to ? t("{from} to {to}", { from, to }) : from ? t("Since {year}", { year: from }) : "");
  const usesRci = regs.some((l) => /rehabilitation council/i.test(l.issuingBody));
  const usesMedicalCouncil = regs.some((l) => l.country === "IN" && !/rehabilitation council/i.test(l.issuingBody));

  return (
    <div className="container-page py-6 sm:py-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Physician",
          name: d.fullName,
          medicalSpecialty: p.specialty.name,
          knowsLanguage: d.languages,
          aggregateRating: rated ? { "@type": "AggregateRating", ratingValue: Number(d.ratingAvg), reviewCount: d.ratingCount } : undefined,
        }}
      />
      <nav aria-label={t("Breadcrumb")} className="mb-4 text-sm text-fg-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/doctors" className="hover:underline">
              {t("Doctors")}
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link href={`/doctors?specialty=${p.specialty.slug}`} className="hover:underline">
              {t(p.specialty.name)}
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li aria-current="page" className="font-medium text-fg">
            {d.fullName}
          </li>
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        {/* Header card */}
        <section className="card p-5 sm:p-6 lg:col-start-1 lg:row-start-1" aria-labelledby="doctor-name">
          <div className="flex flex-col gap-5 sm:flex-row">
            <DoctorAvatar name={d.fullName} photoUrl={d.photoUrl} size={112} />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1">
                <h1 id="doctor-name" className="text-2xl font-extrabold sm:text-3xl">
                  {d.fullName}
                </h1>
                <p className="text-lg font-medium text-heading">
                  {t(p.specialty.name)}
                  {d.subSpecialties.length ? <span className="font-normal text-fg-muted">{`, ${d.subSpecialties.map((s) => t(s)).join(", ")}`}</span> : null}
                </p>
                {quals ? <p className="text-fg-muted">{quals}</p> : null}
              </div>
              <ul className="grid gap-1.5 text-[0.9375rem]">
                <li className="flex items-start gap-2">
                  <Briefcase className="mt-1 size-4 shrink-0 text-fg-muted" aria-hidden />
                  {t("{n} years experience", { n: d.experienceYears })}
                </li>
                {d.languages.length ? (
                  <li className="flex items-start gap-2">
                    <Languages className="mt-1 size-4 shrink-0 text-fg-muted" aria-hidden />
                    {t("Speaks {languages}", { languages: d.languages.map((l) => t(languageName(l))).join(", ") })}
                  </li>
                ) : null}
                {rated ? (
                  <li className="flex items-start gap-2">
                    <Star className="mt-1 size-4 shrink-0 fill-accent text-accent" aria-hidden />
                    <a href="#reviews" className="hover:underline">
                      <strong>{Number(d.ratingAvg).toFixed(1)}</strong> <span className="text-fg-muted">({tp("{count} review", "{count} reviews", Number(d.ratingCount))})</span>
                    </a>
                  </li>
                ) : null}
              </ul>
              {mainReg ? (
                <div className="space-y-1 rounded-xl bg-surface-2 p-3">
                  <VerifiedBadge label={t("Registration verified")} />
                  <p className="text-[0.9375rem]">
                    {t("{council}, registration number {number}.", { council: mainReg.issuingBody, number: mainReg.number })}
                    {lastCheck ? ` ${t("Last checked on {date}.", { date: fmt.date(lastCheck) })}` : ""}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Booking card: right column on large screens, straight after the header on phones */}
        {bookHref ? (
          <aside className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1" aria-labelledby="book-heading">
            <section className="card space-y-4 p-5">
              <h2 id="book-heading" className="text-lg font-bold">
                {t("Book a consultation")}
              </h2>
              {fee ? (
                <p>
                  <span className="block text-3xl font-extrabold text-heading">{fee.label}</span>
                  <span className="text-sm text-fg-muted">{mode === "video" ? t("Video consultation fee") : t("Consultation fee")}</span>
                </p>
              ) : null}
              <ul className="space-y-2">
                {MODES.filter((m) => d.modes.includes(m.mode)).map(({ mode: m, Icon, label }) => (
                  <li key={m} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <Icon className="size-5 shrink-0 text-primary" aria-hidden />
                      {t(label)}
                    </span>
                    <span className="font-semibold">{ctx.priceFor(p.fees, m)?.label}</span>
                  </li>
                ))}
              </ul>
              <p className="flex items-center gap-2 text-sm text-fg-muted">
                <Clock className="size-4 shrink-0" aria-hidden />
                {t("{n} minute consultation", { n: d.consultMinutes })}
              </p>
              <ButtonLink href={bookHref} size="lg" className="w-full whitespace-normal">
                <Video className="size-5 shrink-0" aria-hidden />
                {bookLabel}
              </ButtonLink>
              <ul className="space-y-1.5 text-sm text-fg-muted">
                <li className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {t("Full refund if the doctor does not join within 10 minutes.")}
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {t("You see the full price before you pay.")}
                </li>
              </ul>
            </section>
          </aside>
        ) : null}

        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">
          {lastConsult ? (
            <Alert tone="info" title={t("See the same doctor again")}>
              {t("{patient} consulted {doctor} on {date}. Book a follow up consultation to keep your care in one place.", {
                patient: lastConsult.patientName,
                doctor: d.fullName,
                date: fmt.date(lastConsult.startAt),
              })}{" "}
              <Link href={`/book/${d.slug}?mode=${mode ?? "video"}&type=follow_up`} className="font-semibold text-primary underline">
                {t("Book a follow up")}
              </Link>
            </Alert>
          ) : null}

          {/* Available times */}
          {mode ? (
            <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="times">
              <h2 id="times" className="text-xl font-bold">
                {t("Available times")}
              </h2>
              <SlotPicker
                slots={slots.map((s) => ({ id: s.id, startAt: s.startAt.toISOString() }))}
                tz={ctx.tz}
                zone={fmt.zone()}
                nextHref={`/book/${d.slug}/details?mode=${mode}`}
                stickyAction={false}
              />
            </section>
          ) : null}

          {/* About */}
          <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="about">
            <h2 id="about" className="text-xl font-bold">
              {t("About {name}", { name: d.fullName })}
            </h2>
            {d.about ? <p className="text-[1.0625rem]">{d.about}</p> : null}
            {d.conditionsTreated.length ? (
              <div>
                <h3 className="mb-2 font-semibold">{t("Conditions treated")}</h3>
                <ul className="flex flex-wrap gap-2">
                  {d.conditionsTreated.map((c) => (
                    <li key={c}>
                      <Badge>{t(c)}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {d.procedures.length ? (
              <div>
                <h3 className="mb-2 font-semibold">{t("Treatments and procedures")}</h3>
                <ul className="flex flex-wrap gap-2">
                  {d.procedures.map((c) => (
                    <li key={c}>
                      <Badge>{t(c)}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          {/* Education */}
          {p.quals.length ? (
            <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="education">
              <h2 id="education" className="text-xl font-bold">
                {t("Education")}
              </h2>
              <ul className="space-y-3">
                {p.quals.map((q) => (
                  <li key={q.id} className="flex gap-3">
                    <GraduationCap className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                    <span>
                      <strong className="block text-heading">{q.degree}</strong>
                      <span className="text-fg-muted">
                        {q.institution}, {q.year}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Experience */}
          {d.pastPositions.length || d.awards.length || d.memberships.length || d.publications.length ? (
            <section className="card space-y-5 p-5 sm:p-6" aria-labelledby="experience">
              <h2 id="experience" className="text-xl font-bold">
                {t("Experience")}
              </h2>
              {d.pastPositions.length ? (
                <ul className="space-y-3">
                  {d.pastPositions.map((pp) => (
                    <li key={pp.title + pp.place} className="flex gap-3">
                      <Briefcase className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                      <span>
                        <strong className="block text-heading">{pp.title}</strong>
                        <span className="text-fg-muted">
                          {pp.place}
                          {pp.from ? `, ${years(pp.from, pp.to)}` : ""}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {d.awards.length || d.memberships.length || d.publications.length ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  {d.awards.length ? (
                    <div>
                      <h3 className="mb-1 flex items-center gap-1.5 font-semibold">
                        <Award className="size-4 text-primary" aria-hidden />
                        {t("Awards")}
                      </h3>
                      <ul className="text-[0.9375rem] text-fg-muted">
                        {d.awards.map((a) => (
                          <li key={a.title}>
                            {a.title}
                            {a.year ? `, ${a.year}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {d.memberships.length ? (
                    <div>
                      <h3 className="mb-1 font-semibold">{t("Memberships")}</h3>
                      <ul className="text-[0.9375rem] text-fg-muted">
                        {d.memberships.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {d.publications.length ? (
                    <div>
                      <h3 className="mb-1 flex items-center gap-1.5 font-semibold">
                        <BookOpen className="size-4" aria-hidden />
                        {t("Publications")}
                      </h3>
                      <ul className="text-[0.9375rem] text-fg-muted">
                        {d.publications.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Registration */}
          <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="registration">
            <h2 id="registration" className="text-xl font-bold">
              {t("Registration")}
            </h2>
            <ul className="space-y-2">
              {regs.map((l) => (
                <li key={l.id} className="space-y-2 rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-heading">
                      {l.issuingBody}
                      {l.country !== "IN" ? `, ${country(l.country)}` : ""}
                    </span>
                    <VerifiedBadge label={t("Verified")} />
                  </div>
                  <dl className="grid gap-2 text-[0.9375rem] sm:grid-cols-2">
                    <div>
                      <dt className="text-fg-muted">{t("Registration number")}</dt>
                      <dd className="font-mono text-fg">{l.number}</dd>
                    </div>
                    {l.verifiedAt ? (
                      <div>
                        <dt className="text-fg-muted">{t("Last checked")}</dt>
                        <dd>{fmt.date(l.verifiedAt)}</dd>
                      </div>
                    ) : null}
                  </dl>
                </li>
              ))}
            </ul>
            <p className="text-sm text-fg-muted">{t("We check every doctor's registration before they are listed, and again every 12 months.")}</p>
            {usesMedicalCouncil ? <p className="text-sm text-fg-muted">{t("You can check a doctor's registration on the Indian Medical Register of the National Medical Commission.")}</p> : null}
            {usesRci ? <p className="text-sm text-fg-muted">{t("You can check a psychologist's registration on the Central Rehabilitation Register of the Rehabilitation Council of India.")}</p> : null}
          </section>

          {/* Reviews */}
          <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="reviews">
            <div className="space-y-1">
              <h2 id="reviews" className="text-xl font-bold">
                {t("Patient reviews")}
              </h2>
              <p className="text-sm text-fg-muted">{t("Only patients who have had a consultation with this doctor can leave a review.")}</p>
            </div>
            {p.reviews.length ? (
              <ul className="divide-y divide-line">
                {p.reviews.map((r) => (
                  <li key={r.id} className="space-y-2 py-4 first:pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{r.authorDisplayName}</span>
                      <span className="text-sm text-fg-muted">{fmt.date(r.createdAt)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-0.5" role="img" aria-label={t("{n} out of 5 stars", { n: r.rating })}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={i < r.rating ? "size-4 fill-accent text-accent" : "size-4 text-line"} aria-hidden />
                        ))}
                      </span>
                      <Badge tone="success" className="text-xs">
                        {t("Verified consultation")}
                      </Badge>
                    </div>
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
      </div>
    </div>
  );
}
