import "server-only";
import Link from "next/link";
import { asc, inArray } from "drizzle-orm";
import { CalendarClock, GraduationCap, Languages, Star, Video } from "lucide-react";
import { getDb } from "@/db";
import { doctorQualifications } from "@/db/schema";
import { DoctorAvatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { ButtonLink } from "@/components/ui/button";
import { languageName } from "@/config/languages";
import { dayInZone } from "@/lib/time";
import type { DoctorListItem } from "@/server/doctors";
import type { ViewContext } from "@/server/context";

/**
 * Qualification lines ("MBBS, MS (Orthopaedics)") for several doctors in one
 * query. Pages that list doctors call this once and pass each line to
 * DoctorCard; a card without one loads its own.
 */
export async function loadQualificationLines(doctorIds: string[]) {
  const lines = new Map<string, string>();
  if (!doctorIds.length) return lines;
  const db = await getDb();
  const rows = await db
    .select({ doctorId: doctorQualifications.doctorId, degree: doctorQualifications.degree })
    .from(doctorQualifications)
    .where(inArray(doctorQualifications.doctorId, doctorIds))
    .orderBy(asc(doctorQualifications.year));
  for (const r of rows) lines.set(r.doctorId, lines.has(r.doctorId) ? `${lines.get(r.doctorId)}, ${r.degree}` : r.degree);
  return lines;
}

/** The online mode a card or profile books by default: video when offered. */
export function defaultOnlineMode(modes: readonly string[]) {
  return (["video", "audio", "chat"] as const).find((m) => modes.includes(m)) ?? null;
}

/** Doctor card for listings: who they are, when they are free, the fee, and one clear button to book. */
export async function DoctorCard({ d, ctx, qualifications }: { d: DoctorListItem; ctx: ViewContext; qualifications?: string }) {
  const { t, tp, fmt, priceFor } = ctx;
  const quals = qualifications ?? (await loadQualificationLines([d.id])).get(d.id) ?? "";
  const mode = defaultOnlineMode(d.modes);
  const price = mode ? priceFor(d.fees, mode) : null;
  const profile = `/doctors/${d.slug}`;
  const rated = Number(d.ratingCount) > 0;
  const today = d.nextOnline ? dayInZone(d.nextOnline, ctx.tz) === dayInZone(new Date(), ctx.tz) : false;

  return (
    <article className="card @container flex flex-col p-4 sm:p-5" aria-labelledby={`doc-${d.id}`}>
      <div className="flex flex-1 flex-col gap-4 @2xl:flex-row @2xl:items-stretch">
        <div className="flex min-w-0 flex-1 gap-4">
          <DoctorAvatar name={d.fullName} photoUrl={d.photoUrl} size={72} />
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <h3 id={`doc-${d.id}`} className="text-lg font-bold leading-snug">
                <Link href={profile} className="text-primary hover:underline">
                  {d.fullName}
                </Link>
              </h3>
              <p className="font-medium text-heading">{t(d.specialtyName)}</p>
              {quals ? <p className="text-sm text-fg-muted">{quals}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <VerifiedBadge label={t("Registration verified")} title={d.lastVerifiedAt ? t("Last checked on {date}", { date: fmt.date(d.lastVerifiedAt) }) : undefined} />
              {rated ? (
                <span className="inline-flex items-center gap-1 text-[0.9375rem]">
                  <Star className="size-4 fill-accent text-accent" aria-hidden />
                  <strong>{Number(d.ratingAvg).toFixed(1)}</strong>
                  <span className="text-fg-muted">({tp("{count} review", "{count} reviews", Number(d.ratingCount))})</span>
                </span>
              ) : null}
            </div>
            <ul className="grid gap-1 text-[0.9375rem]">
              <li className="flex items-start gap-2">
                <GraduationCap className="mt-1 size-4 shrink-0 text-fg-muted" aria-hidden />
                <span>{t("{n} years experience", { n: d.experienceYears })}</span>
              </li>
              {d.languages.length ? (
                <li className="flex items-start gap-2">
                  <Languages className="mt-1 size-4 shrink-0 text-fg-muted" aria-hidden />
                  <span>{t("Speaks {languages}", { languages: d.languages.map((l) => t(languageName(l))).join(", ") })}</span>
                </li>
              ) : null}
              <li className="flex items-start gap-2">
                <CalendarClock className="mt-1 size-4 shrink-0 text-fg-muted" aria-hidden />
                {d.nextOnline ? (
                  <span>
                    {today ? <span className="font-semibold text-success">{t("Available today")}</span> : t("Next available")}
                    {": "}
                    <strong className="font-semibold">{today ? fmt.time(d.nextOnline) : fmt.dateTime(d.nextOnline)}</strong>
                  </span>
                ) : (
                  <span className="text-fg-muted">{t("No free times at the moment")}</span>
                )}
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col justify-end gap-3 border-t border-line pt-4 @2xl:w-72 @2xl:shrink-0 @2xl:border-s @2xl:border-t-0 @2xl:ps-5 @2xl:pt-0">
          {price ? (
            <p>
              <span className="block text-2xl font-extrabold text-heading">{price.label}</span>
              <span className="text-sm text-fg-muted">{mode === "video" ? t("Video consultation fee") : t("Consultation fee")}</span>
            </p>
          ) : null}
          <div className="flex flex-col gap-2 @md:flex-row @2xl:flex-col">
            {mode ? (
              <ButtonLink
                href={`/book/${d.slug}?mode=${mode}`}
                aria-label={mode === "video" ? t("Book video consultation with {name}", { name: d.fullName }) : t("Book consultation with {name}", { name: d.fullName })}
                className="whitespace-normal @md:flex-1 @2xl:flex-none"
              >
                <Video className="size-5 shrink-0" aria-hidden />
                {mode === "video" ? t("Book video consultation") : t("Book consultation")}
              </ButtonLink>
            ) : null}
            <ButtonLink
              href={profile}
              variant={mode ? "outline" : "primary"}
              aria-label={t("View profile of {name}", { name: d.fullName })}
              className="whitespace-normal @md:flex-1 @2xl:flex-none"
            >
              {t("View profile")}
            </ButtonLink>
          </div>
        </div>
      </div>
    </article>
  );
}
