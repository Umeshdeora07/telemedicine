import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Building2, MessageSquare, Phone, Video } from "lucide-react";
import { getViewContext } from "@/server/context";
import { getDoctorProfile, getOpenSlots, isDoctorVisible } from "@/server/doctors";
import { describeLocation, locationParam, resolveLocation } from "@/server/location";
import { getDb } from "@/db";
import { DoctorAvatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { sameClock } from "@/lib/time";
import { Stepper } from "@/components/ui/stepper";
import { SlotPicker } from "@/components/booking/slot-picker";
import { NoLicensedDoctors } from "@/components/location/no-licensed-doctors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Book a consult" };

const ICON = { video: Video, audio: Phone, chat: MessageSquare, in_clinic: Building2 } as const;

export default async function BookStep1({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = await getDoctorProfile(slug);
  if (!p) notFound();
  const ctx = await getViewContext();
  const { t } = ctx;
  const d = p.doctor;
  const requested = (sp.mode as keyof typeof ICON) || undefined;
  const mode = requested && d.modes.includes(requested) ? requested : d.modes.find((m) => m !== "in_clinic") ?? d.modes[0]!;
  const passThrough = new URLSearchParams();
  for (const k of ["for", "from", "type"]) if (sp[k]) passThrough.set(k, sp[k]!);

  // A slot chosen on the profile page goes straight to step 2.
  if (sp.slot) redirect(`/book/${slug}/details?mode=${mode}&slot=${sp.slot}${passThrough.size ? `&${passThrough}` : ""}`);

  const loc = mode === "in_clinic" ? { country: "IN", region: null } : resolveLocation(sp.for, ctx.declared, ctx.user);
  const place = await describeLocation(loc);
  const db = await getDb();
  const allowed = await isDoctorVisible(db, d.id, loc);
  const slots = allowed ? await getOpenSlots(db, d.id, mode === "in_clinic" ? "in_clinic" : "online", { days: 14 }) : [];
  if (mode !== "in_clinic") passThrough.set("for", locationParam(loc));
  const modeLabel = { video: t("Video"), audio: t("Audio"), chat: t("Chat"), in_clinic: t("Clinic visit") };
  const clinic = p.clinics[0]?.clinic;

  return (
    <div className="space-y-6">
      <Stepper current={1} total={4} label={t("Step {current} of {total}: choose a time", { current: 1, total: 4 })} />
      <div className="card flex items-center gap-4 p-4">
        <DoctorAvatar name={d.fullName} seed={d.avatarSeed} gender={d.gender} photoUrl={d.photoUrl} size={56} senior={d.experienceYears >= 20} />
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold">{t("Book with {name}", { name: d.fullName })}</h1>
          <p className="text-fg-muted">{t(p.specialty.name)}</p>
          <VerifiedBadge label={t("Verified")} className="mt-1" />
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 font-semibold text-heading">{t("How would you like to consult?")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {d.modes.map((m) => {
            const Icon = ICON[m];
            const price = ctx.priceFor(p.fees, m);
            const active = m === mode;
            return (
              <Link
                key={m}
                href={`/book/${slug}?mode=${m}${passThrough.size ? `&${passThrough}` : ""}`}
                aria-current={active ? "true" : undefined}
                className={cn("flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center", active ? "border-primary bg-primary-soft ring-2 ring-primary" : "border-field bg-surface hover:border-primary")}
                replace
              >
                <Icon className="size-6 text-primary" aria-hidden />
                <span className="font-semibold">{modeLabel[m]}</span>
                <span className="text-sm text-fg-muted">{price?.label}</span>
              </Link>
            );
          })}
        </div>
      </fieldset>

      {mode === "in_clinic" && clinic ? (
        <p className="rounded-xl bg-surface-2 p-3 text-[0.9375rem]">
          <strong>{clinic.name}</strong> · {clinic.addressLine}, {clinic.city}
        </p>
      ) : null}
      {mode === "audio" || mode === "chat" ? (
        <p className="rounded-xl bg-accent-soft p-3 text-[0.9375rem]">
          {t("Tip: some medicines can only be prescribed after a video consult for a first visit. Choose video if you may need a prescription.")}
        </p>
      ) : null}

      {!allowed ? (
        <NoLicensedDoctors t={t} locationLabel={place.label} needsRegion={place.needsRegion} />
      ) : (
        <section aria-labelledby="pick-time" className="space-y-3">
          <div>
            <h2 id="pick-time" className="text-lg font-bold">{t("Pick a time")}</h2>
            <p className="text-sm text-fg-muted">
              {t("Times in your time zone ({zone}).", { zone: ctx.fmt.zone() })}
              {!sameClock(d.timeZone, ctx.tz) ? ` ${t("Doctor's local time shown in small text.")}` : ""}
            </p>
          </div>
          <SlotPicker
            slots={slots.map((s) => ({ id: s.id, startAt: s.startAt.toISOString() }))}
            tz={ctx.tz}
            doctorTz={d.timeZone}
            nextHref={`/book/${slug}/details?mode=${mode}${passThrough.size ? `&${passThrough}` : ""}`}
          />
        </section>
      )}
    </div>
  );
}
