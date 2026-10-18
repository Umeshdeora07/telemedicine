import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MessageSquare, Phone, Video } from "lucide-react";
import { getViewContext } from "@/server/context";
import { getDoctorProfile, getOpenSlots } from "@/server/doctors";
import { getDb } from "@/db";
import { DoctorAvatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Stepper } from "@/components/ui/stepper";
import { SlotPicker } from "@/components/booking/slot-picker";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Book a consultation" };

/** Ways to consult on the public booking flow, video first. Clinic visits are booked only after an online consultation. */
const ONLINE_MODES = ["video", "audio", "chat"] as const;
type OnlineMode = (typeof ONLINE_MODES)[number];
const ICON = { video: Video, audio: Phone, chat: MessageSquare } as const;

export default async function BookStep1({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  // getDoctorProfile only returns doctors who may be booked (verified, with an Indian registration).
  const p = await getDoctorProfile(slug);
  if (!p) notFound();
  const ctx = await getViewContext();
  const { t } = ctx;
  const d = p.doctor;
  const modes = ONLINE_MODES.filter((m) => d.modes.includes(m));
  if (!modes.length) redirect(`/doctors/${slug}`);
  const requested = one("mode") as OnlineMode | undefined;
  const mode: OnlineMode = requested && modes.includes(requested) ? requested : modes[0]!;
  const passThrough = new URLSearchParams();
  for (const k of ["from", "type"]) {
    const v = one(k);
    if (v) passThrough.set(k, v);
  }
  const extra = passThrough.size ? `&${passThrough}` : "";

  // A time chosen on the profile page goes straight to step 2.
  const slot = one("slot");
  if (slot) redirect(`/book/${slug}/details?mode=${mode}&slot=${encodeURIComponent(slot)}${extra}`);

  const db = await getDb();
  const slots = await getOpenSlots(db, d.id, "online", { days: 14 });
  const modeLabel = { video: t("Video consultation"), audio: t("Audio call"), chat: t("Chat") };
  const quals = p.quals.map((q) => q.degree).join(", ");

  return (
    <div className="space-y-6">
      <Stepper current={1} total={4} label={t("Step {current} of {total}: choose a time", { current: 1, total: 4 })} />
      <div className="card flex items-center gap-4 p-4 sm:p-5">
        <DoctorAvatar name={d.fullName} photoUrl={d.photoUrl} size={64} />
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-extrabold sm:text-2xl">{t("Book a consultation with {name}", { name: d.fullName })}</h1>
          <p className="text-fg-muted">
            {t(p.specialty.name)}
            {quals ? <span className="block text-sm">{quals}</span> : null}
          </p>
          <VerifiedBadge label={t("Registration verified")} />
        </div>
      </div>

      <section aria-labelledby="pick-mode">
        <h2 id="pick-mode" className="mb-2 text-lg font-bold">
          {t("How would you like to talk to the doctor?")}
        </h2>
        <div className={cn("grid gap-2", modes.length === 3 ? "grid-cols-3" : modes.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
          {modes.map((m) => {
            const Icon = ICON[m];
            const price = ctx.priceFor(p.fees, m);
            const active = m === mode;
            return (
              <Link
                key={m}
                href={`/book/${slug}?mode=${m}${extra}`}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center sm:p-3",
                  active ? "border-primary bg-primary-soft ring-2 ring-primary" : "border-field bg-surface hover:border-primary",
                )}
                replace
                scroll={false}
              >
                <Icon className="size-6 text-primary" aria-hidden />
                <span className="text-sm font-semibold leading-tight sm:text-base">{modeLabel[m]}</span>
                {price ? <span className="text-sm text-fg-muted">{price.label}</span> : null}
              </Link>
            );
          })}
        </div>
      </section>

      {mode !== "video" ? (
        <p className="rounded-xl bg-accent-soft p-3 text-[0.9375rem]">
          {t("For a first consultation, some medicines can only be prescribed after a video call. Choose video if you may need a prescription.")}
        </p>
      ) : null}

      <section aria-labelledby="pick-time" className="space-y-3">
        <h2 id="pick-time" className="text-lg font-bold">
          {t("Choose a time")}
        </h2>
        <SlotPicker slots={slots.map((s) => ({ id: s.id, startAt: s.startAt.toISOString() }))} tz={ctx.tz} zone={ctx.fmt.zone()} nextHref={`/book/${slug}/details?mode=${mode}${extra}`} />
      </section>
    </div>
  );
}
