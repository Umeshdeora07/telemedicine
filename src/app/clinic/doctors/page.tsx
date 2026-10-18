import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { availabilitySlots } from "@/db/schema";
import { getViewContext } from "@/server/context";
import { clinicRoster, currentClinic } from "@/server/clinic-portal";
import { clinicToggleSlotAction } from "@/server/actions/clinic";
import { PageHeader } from "@/components/ui/page-header";
import { DoctorAvatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SlotToggle } from "@/components/doctor/slot-toggle";
import { dayInZone } from "@/lib/time";

export const metadata: Metadata = { title: "Doctors and slots" };

export default async function ClinicDoctors() {
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const clinic = (await currentClinic(user!))!;
  const roster = await clinicRoster(clinic);
  const db = await getDb();
  const from = new Date();
  const to = new Date(Date.now() + 7 * 86400_000);
  const slots = roster.length
    ? await db
        .select()
        .from(availabilitySlots)
        .where(and(inArray(availabilitySlots.doctorId, roster.map((r) => r.d.id)), eq(availabilitySlots.clinicId, clinic.id), gte(availabilitySlots.startAt, from), lt(availabilitySlots.startAt, to)))
        .orderBy(asc(availabilitySlots.startAt))
    : [];
  return (
    <div className="space-y-6">
      <PageHeader title={t("Doctors and clinic slots")} description={t("Clinic slots for the next 7 days. Tap a free slot to close it (for example, when the doctor is on leave) and tap again to reopen it. Booked slots can't be closed here. Cancel the visit instead.")} />
      {roster.length ? (
        roster.map((r) => {
          const mine = slots.filter((s) => s.doctorId === r.d.id);
          const days = [...new Set(mine.map((s) => dayInZone(s.startAt, clinic.timeZone)))];
          return (
            <section key={r.d.id} className="card space-y-3 p-5" aria-labelledby={`doc-${r.d.id}`}>
              <div className="flex flex-wrap items-center gap-3">
                <DoctorAvatar name={r.d.fullName} seed={r.d.avatarSeed} gender={r.d.gender} photoUrl={r.d.photoUrl} size={48} senior={r.d.experienceYears >= 20} />
                <div>
                  <h2 id={`doc-${r.d.id}`} className="text-lg font-bold"><Link href={`/doctors/${r.d.slug}`} className="hover:underline">{r.d.fullName}</Link></h2>
                  <p className="text-sm text-fg-muted">{t(r.specialty)} · {t(r.role)} · {t("Clinic fee {fee}", { fee: fmt.money(r.inClinicFeeMinor, "INR") })}</p>
                </div>
                <p className="ms-auto text-sm"><strong>{r.booked}</strong> {t("booked")} · <strong>{r.open}</strong> {t("free")}</p>
              </div>
              {days.length ? (
                <div className="space-y-2">
                  {days.map((day) => (
                    <div key={day} className="flex flex-wrap items-center gap-1.5">
                      <span className="w-28 text-sm font-semibold">{fmt.date(`${day}T12:00:00Z`, "UTC", { weekday: "short", day: "numeric", month: "short" })}</span>
                      {mine.filter((s) => dayInZone(s.startAt, clinic.timeZone) === day).map((s) => (
                        <SlotToggle key={s.id} id={s.id} status={s.status} label={fmt.time(s.startAt, clinic.timeZone)} action={clinicToggleSlotAction} />
                      ))}
                    </div>
                  ))}
                </div>
              ) : <p className="text-fg-muted">{t("No clinic hours set for the next 7 days.")}</p>}
            </section>
          );
        })
      ) : (
        <EmptyState title={t("No doctors linked to this clinic")} />
      )}
    </div>
  );
}
