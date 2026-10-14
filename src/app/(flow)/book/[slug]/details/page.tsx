import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft, Clock } from "lucide-react";
import { getViewContext } from "@/server/context";
import { getDoctorProfile } from "@/server/doctors";
import { locationOptions, resolveLocation } from "@/server/location";
import { bookablePatients } from "@/server/booking";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/db";
import { availabilitySlots } from "@/db/schema";
import { sameClock } from "@/lib/time";
import { Stepper } from "@/components/ui/stepper";
import { Alert } from "@/components/ui/alert";
import { DetailsForm } from "@/components/booking/details-form";
import { ageFrom } from "@/lib/utils";

export const metadata: Metadata = { title: "Who and where" };

export default async function BookStep2({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const p = await getDoctorProfile(slug);
  if (!p) notFound();
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const db = await getDb();
  const mode = (sp.mode ?? "video") as "video" | "audio" | "chat" | "in_clinic";
  const [slot] = sp.slot ? await db.select().from(availabilitySlots).where(and(eq(availabilitySlots.id, sp.slot), eq(availabilitySlots.doctorId, p.doctor.id))) : [];
  if (!slot) {
    return (
      <Alert tone="warning" title={t("Please pick a time first")}>
        <Link href={`/book/${slug}?mode=${mode}`} className="font-semibold text-primary underline">{t("Choose a time")}</Link>
      </Alert>
    );
  }
  const taken = slot.status === "booked" || (slot.status === "held" && slot.heldUntil && slot.heldUntil > new Date());
  const people = await bookablePatients(db, user.id);
  const options = await locationOptions();
  const loc = resolveLocation(sp.for, ctx.declared, user);
  const modeLabel = { video: t("Video consult"), audio: t("Audio call"), chat: t("Chat consult"), in_clinic: t("Clinic visit") }[mode];

  return (
    <div className="space-y-6">
      <Stepper current={2} total={4} label={t("Step {current} of {total}: who and where", { current: 2, total: 4 })} />
      <Link href={`/book/${slug}?mode=${mode}${sp.for ? `&for=${sp.for}` : ""}`} className="tap inline-flex items-center gap-1 font-semibold text-primary">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> {t("Change time")}
      </Link>
      <div className="card flex items-start gap-3 p-4">
        <Clock className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="font-semibold text-heading">
            {modeLabel} · {p.doctor.fullName}
          </p>
          <p>
            {fmt.dateTime(slot.startAt)} <span className="text-fg-muted">({fmt.zone()})</span>
          </p>
          {!sameClock(p.doctor.timeZone, ctx.tz) ? <p className="text-sm text-fg-muted">{t("Doctor's time: {time}", { time: fmt.dateTime(slot.startAt, p.doctor.timeZone) })}</p> : null}
        </div>
      </div>
      {taken ? (
        <Alert tone="warning" title={t("This time was just taken")}>
          <Link href={`/book/${slug}?mode=${mode}`} className="font-semibold text-primary underline">{t("Pick another time")}</Link>
        </Alert>
      ) : (
        <DetailsForm
          doctorSlug={slug}
          mode={mode}
          slotId={slot.id}
          from={sp.from}
          type={sp.type}
          people={people.map((x) => ({ id: x.patient.id, name: x.patient.fullName, relationship: x.relationship, age: ageFrom(x.patient.dob), status: x.status, canBook: x.canBook, country: x.patient.country }))}
          options={options}
          defaultLocation={loc}
          addFamilyHref={`/family/new?next=${encodeURIComponent(`/book/${slug}/details?mode=${mode}&slot=${slot.id}`)}`}
        />
      )}
    </div>
  );
}
