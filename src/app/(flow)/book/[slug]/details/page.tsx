import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { getViewContext } from "@/server/context";
import { getDoctorProfile } from "@/server/doctors";
import { bookablePatients } from "@/server/booking";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/db";
import { availabilitySlots } from "@/db/schema";
import { Stepper } from "@/components/ui/stepper";
import { Alert } from "@/components/ui/alert";
import { DetailsForm } from "@/components/booking/details-form";
import { ageFrom } from "@/lib/utils";

export const metadata: Metadata = { title: "Who is the consultation for" };

const ONLINE_MODES = ["video", "audio", "chat"] as const;
type OnlineMode = (typeof ONLINE_MODES)[number];

export default async function BookStep2({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const user = await requireUser();
  const p = await getDoctorProfile(slug);
  if (!p) notFound();
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const db = await getDb();
  // The public flow books online consultations only; video is the default.
  const requested = one("mode") as OnlineMode | undefined;
  const mode: OnlineMode = requested && ONLINE_MODES.includes(requested) && p.doctor.modes.includes(requested) ? requested : (ONLINE_MODES.find((m) => p.doctor.modes.includes(m)) ?? "video");
  const slotId = one("slot");
  const validId = slotId && /^[0-9a-f-]{36}$/i.test(slotId);
  const [slot] = validId
    ? await db
        .select()
        .from(availabilitySlots)
        .where(and(eq(availabilitySlots.id, slotId), eq(availabilitySlots.doctorId, p.doctor.id), eq(availabilitySlots.group, "online")))
    : [];
  const back = `/book/${slug}?mode=${mode}`;
  if (!slot) {
    return (
      <Alert tone="warning" title={t("Please choose a time first")}>
        <Link href={back} className="font-semibold text-primary underline">
          {t("Choose a time")}
        </Link>
      </Alert>
    );
  }
  const taken = slot.status === "booked" || (slot.status === "held" && slot.heldUntil && slot.heldUntil > new Date());
  const people = await bookablePatients(db, user.id);
  const modeLabel = { video: t("Video consultation"), audio: t("Audio call"), chat: t("Chat consultation") }[mode];
  const detailsHref = `/book/${slug}/details?mode=${mode}&slot=${slot.id}`;

  return (
    <div className="space-y-6">
      <Stepper current={2} total={4} label={t("Step {current} of {total}: who is it for", { current: 2, total: 4 })} />
      <Link href={back} className="tap inline-flex items-center gap-1 font-semibold text-primary">
        <ArrowLeft className="size-4" aria-hidden /> {t("Change time")}
      </Link>
      <div className="card flex items-start gap-3 p-4">
        <CalendarClock className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="font-semibold text-heading">{t("{mode} with {doctor}", { mode: modeLabel, doctor: p.doctor.fullName })}</p>
          <p>
            {fmt.dateTime(slot.startAt)} <span className="text-fg-muted">({t("your local time, {zone}", { zone: fmt.zone(ctx.tz, slot.startAt) })})</span>
          </p>
        </div>
      </div>
      {taken ? (
        <Alert tone="warning" title={t("Someone has just booked this time")}>
          <Link href={back} className="font-semibold text-primary underline">
            {t("Choose another time")}
          </Link>
        </Alert>
      ) : (
        <DetailsForm
          doctorSlug={slug}
          mode={mode}
          slotId={slot.id}
          from={one("from")}
          type={one("type")}
          people={people.map((x) => ({ id: x.patient.id, name: x.patient.fullName, relationship: x.relationship, age: ageFrom(x.patient.dob), status: x.status, canBook: x.canBook }))}
          addFamilyHref={`/family/new?next=${encodeURIComponent(detailsHref)}`}
        />
      )}
    </div>
  );
}
