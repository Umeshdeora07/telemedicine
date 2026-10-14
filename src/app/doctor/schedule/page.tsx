import type { Metadata } from "next";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { getViewContext } from "@/server/context";
import { doctorForUser } from "@/server/consult";
import { getDb } from "@/db";
import { availabilityRules, availabilitySlots, clinics, doctorClinicLinks } from "@/db/schema";
import { PageHeader } from "@/components/ui/page-header";
import { ScheduleEditor } from "@/components/doctor/schedule-editor";
import { SlotToggle } from "@/components/doctor/slot-toggle";
import { dayInZone } from "@/lib/time";

export const metadata: Metadata = { title: "Availability" };

export default async function SchedulePage() {
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const d = (await doctorForUser(ctx.user!))!;
  const db = await getDb();
  const [rules, clinicRows, slots] = await Promise.all([
    db.select().from(availabilityRules).where(eq(availabilityRules.doctorId, d.id)),
    db.select({ id: clinics.id, name: clinics.name }).from(doctorClinicLinks).innerJoin(clinics, eq(clinics.id, doctorClinicLinks.clinicId)).where(and(eq(doctorClinicLinks.doctorId, d.id), eq(doctorClinicLinks.active, true))),
    db
      .select()
      .from(availabilitySlots)
      .where(and(eq(availabilitySlots.doctorId, d.id), gt(availabilitySlots.startAt, new Date()), lt(availabilitySlots.startAt, new Date(Date.now() + 7 * 86400_000)), inArray(availabilitySlots.status, ["open", "blocked", "booked", "held"])))
      .orderBy(availabilitySlots.startAt),
  ]);
  const byDay = new Map<string, typeof slots>();
  for (const s of slots) {
    const k = dayInZone(s.startAt, d.timeZone);
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }
  return (
    <div className="space-y-8">
      <PageHeader title={t("Availability")} description={t("Set weekly hours for online consults and clinic visits. Slots are created for the next 3 weeks.")} />
      <div className="grid gap-8 xl:grid-cols-[1fr_24rem]">
        <ScheduleEditor
          timeZone={d.timeZone}
          defaultSlot={d.consultMinutes}
          clinics={clinicRows}
          initial={rules.map((r) => ({ group: r.group, clinicId: r.clinicId, weekday: r.weekday, startTime: r.startTime, endTime: r.endTime, slotMinutes: r.slotMinutes }))}
        />
        <section className="space-y-3" aria-labelledby="week">
          <h2 id="week" className="text-lg font-bold">{t("Next 7 days")}</h2>
          <p className="text-sm text-fg-muted">{t("Tap a free slot to block it (for leave or a meeting). Booked slots can't be blocked here.")}</p>
          {[...byDay.entries()].map(([day, list]) => (
            <div key={day} className="card p-3">
              <h3 className="mb-2 text-sm font-semibold">{fmt.date(list[0]!.startAt, d.timeZone, { weekday: "short", day: "numeric", month: "short", year: undefined })}</h3>
              <div className="flex flex-wrap gap-1.5">
                {list.map((s) => <SlotToggle key={s.id} id={s.id} label={`${fmt.time(s.startAt, d.timeZone)}${s.group === "in_clinic" ? " 🏥" : ""}`} status={s.status} />)}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
