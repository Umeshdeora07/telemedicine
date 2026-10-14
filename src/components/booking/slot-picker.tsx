"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Slot = { id: string; startAt: string };

/** Day strip + time grid. Times are in the viewer's zone; the doctor's local time is shown small. */
export function SlotPicker({ slots, tz, doctorTz, nextHref, initialSlot }: { slots: Slot[]; tz: string; doctorTz: string; nextHref: string; initialSlot?: string }) {
  const { t, intl } = useI18n();
  const router = useRouter();
  const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  const days = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = dayKey(s.startAt);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return [...m.entries()];
  }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps
  const initialDay = initialSlot ? dayKey(slots.find((s) => s.id === initialSlot)?.startAt ?? slots[0]?.startAt ?? "") : days[0]?.[0];
  const [day, setDay] = useState(initialDay);
  const [slot, setSlot] = useState<string | undefined>(initialSlot);
  const fmtDay = (iso: string) => new Intl.DateTimeFormat(intl, { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
  const fmtTime = (iso: string, zone = tz) => new Intl.DateTimeFormat(intl, { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  const showDoctorTime = slots[0] ? fmtTime(slots[0].startAt) !== fmtTime(slots[0].startAt, doctorTz) : false;
  const current = days.find(([k]) => k === day)?.[1] ?? [];
  const groups = [
    { label: t("Morning"), items: current.filter((s) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date(s.startAt))) < 12) },
    { label: t("Afternoon"), items: current.filter((s) => { const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date(s.startAt))); return h >= 12 && h < 17; }) },
    { label: t("Evening"), items: current.filter((s) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date(s.startAt))) >= 17) },
  ];

  if (!slots.length) return <p className="card p-5 text-fg-muted">{t("No free times in the next 2 weeks. Please choose another doctor or try Consult now.")}</p>;

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label={t("Choose a day")} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map(([k, list]) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={k === day}
            onClick={() => setDay(k)}
            className={cn("tap flex min-w-20 shrink-0 flex-col items-center rounded-xl border px-3 py-2", k === day ? "border-primary bg-primary text-on-primary" : "border-field bg-surface hover:border-primary")}
          >
            <span className="text-sm font-semibold">{fmtDay(list[0]!.startAt)}</span>
            <span className={cn("text-xs", k === day ? "text-on-primary/90" : "text-fg-muted")}>{t("{n} free", { n: list.length })}</span>
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label={t("Choose a time")} className="space-y-4">
        {groups
          .filter((g) => g.items.length)
          .map((g) => (
            <div key={g.label}>
              <h3 className="mb-2 text-sm font-semibold text-fg-muted">{g.label}</h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {g.items.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={slot === s.id}
                    onClick={() => setSlot(s.id)}
                    className={cn("tap flex flex-col items-center justify-center rounded-xl border px-2 py-1.5", slot === s.id ? "border-primary bg-primary-soft ring-2 ring-primary" : "border-field bg-surface hover:border-primary")}
                  >
                    <span className="font-semibold">{fmtTime(s.startAt)}</span>
                    {showDoctorTime ? <span className="text-xs text-fg-muted">{t("Dr: {time}", { time: fmtTime(s.startAt, doctorTz) })}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
      <div className="sticky bottom-0 -mx-4 border-t border-line bg-page/95 px-4 py-3 backdrop-blur">
        <Button size="lg" className="w-full" disabled={!slot} onClick={() => slot && router.push(`${nextHref}&slot=${slot}`)}>
          {t("Continue")}
        </Button>
      </div>
    </div>
  );
}
