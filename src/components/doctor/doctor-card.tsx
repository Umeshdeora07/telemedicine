import Link from "next/link";
import { Clock, Languages, MapPin, Star, Video, Building2 } from "lucide-react";
import { DoctorAvatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { ButtonLink } from "@/components/ui/button";
import { languageName } from "@/config/languages";
import type { DoctorListItem } from "@/server/doctors";
import type { ViewContext } from "@/server/context";

export function DoctorCard({ d, ctx, forLocation }: { d: DoctorListItem; ctx: ViewContext; forLocation?: string }) {
  const { t, fmt, priceFor } = ctx;
  const online = d.modes.find((m) => m !== "in_clinic");
  const price = online ? priceFor(d.fees, online) : priceFor(d.fees, "in_clinic");
  const hasClinic = d.modes.includes("in_clinic");
  const q = forLocation ? `?for=${forLocation}` : "";
  return (
    <article className="card flex flex-col gap-4 p-4 sm:p-5" aria-labelledby={`doc-${d.id}`}>
      <div className="flex gap-4">
        <DoctorAvatar name={d.fullName} seed={d.avatarSeed} gender={d.gender} photoUrl={d.photoUrl} size={72} senior={d.experienceYears >= 20} />
        <div className="min-w-0 flex-1 space-y-1">
          <h3 id={`doc-${d.id}`} className="text-lg font-bold leading-snug">
            <Link href={`/doctors/${d.slug}${q}`} className="hover:underline">
              {d.fullName}
            </Link>
          </h3>
          <p className="text-fg-muted">
            {t(d.specialtyName)} · {t("{n} years", { n: d.experienceYears })}
          </p>
          <VerifiedBadge label={t("Verified")} title={d.lastVerifiedAt ? t("Licence checked on {date}", { date: fmt.date(d.lastVerifiedAt) }) : undefined} />
        </div>
      </div>
      <ul className="grid gap-1.5 text-[0.9375rem] text-fg">
        <li className="flex items-center gap-2">
          <Star className="size-4 fill-accent text-accent" aria-hidden />
          {Number(d.ratingCount) > 0 ? (
            <span>
              <strong>{Number(d.ratingAvg).toFixed(1)}</strong> <span className="text-fg-muted">({t("{n} reviews", { n: d.ratingCount })})</span>
            </span>
          ) : (
            <span className="text-fg-muted">{t("New doctor")}</span>
          )}
        </li>
        <li className="flex items-center gap-2">
          <Languages className="size-4 text-fg-muted" aria-hidden />
          <span>{d.languages.map((l) => t(languageName(l))).join(", ")}</span>
        </li>
        {d.clinicName ? (
          <li className="flex items-center gap-2">
            <MapPin className="size-4 text-fg-muted" aria-hidden />
            <span>
              {d.clinicName}, {d.clinicCity}
            </span>
          </li>
        ) : null}
        <li className="flex items-center gap-2">
          <Clock className="size-4 text-fg-muted" aria-hidden />
          {d.nextOnline ? (
            <span>
              {t("Next online:")} <strong>{fmt.dateTime(d.nextOnline)}</strong>
            </span>
          ) : d.nextClinic ? (
            <span>
              {t("Next clinic slot:")} <strong>{fmt.dateTime(d.nextClinic)}</strong>
            </span>
          ) : (
            <span className="text-fg-muted">{t("No slots in the next 2 weeks")}</span>
          )}
        </li>
      </ul>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
        <p>
          {price ? (
            <>
              <span className="text-xl font-extrabold text-heading">{price.label}</span>
              <span className="block text-sm text-fg-muted">{online ? t("per online consult") : t("per clinic visit")}</span>
            </>
          ) : null}
        </p>
        <div className="flex gap-2">
          {hasClinic && online ? (
            <ButtonLink href={`/book/${d.slug}?mode=in_clinic`} variant="outline" size="sm" aria-label={t("Book clinic visit with {name}", { name: d.fullName })}>
              <Building2 className="size-4" aria-hidden />
              <span className="hidden sm:inline">{t("Clinic")}</span>
            </ButtonLink>
          ) : null}
          <ButtonLink href={`/book/${d.slug}${online ? "" : "?mode=in_clinic"}${q ? (online ? q : q.replace("?", "&")) : ""}`} size="sm" aria-label={t("Consult {name}", { name: d.fullName })}>
            {online ? <Video className="size-4" aria-hidden /> : <Building2 className="size-4" aria-hidden />}
            {online ? t("Consult") : t("Book visit")}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
