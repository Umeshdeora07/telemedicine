"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Slot = { id: string; startAt: string };

/**
 * Day strip and time grid. Every time is shown in the viewer's own time zone,
 * with one hint that says so. `zone` is the short zone name from the server
 * (for example "IST"). `stickyAction` keeps the Continue button in view on
 * the booking page; inside a card (the doctor's profile) it sits below the times.
 */
export function SlotPicker({
  slots,
  tz,
  zone,
  nextHref,
  initialSlot,
  stickyAction = true,
}: {
  slots: Slot[];
  tz: string;
  zone: string;
  nextHref: string;
  initialSlot?: string;
  stickyAction?: boolean;
}) {
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
  const fmtTime = (iso: string) => new Intl.DateTimeFormat(intl, { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  const hour = (iso: string) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
  const current = days.find(([k]) => k === day)?.[1] ?? [];
  const groups = [
    { label: t("Morning"), items: current.filter((s) => hour(s.startAt) < 12) },
    { label: t("Afternoon"), items: current.filter((s) => hour(s.startAt) >= 12 && hour(s.startAt) < 17) },
    { label: t("Evening"), items: current.filter((s) => hour(s.startAt) >= 17) },
  ];

  if (!slots.length) {
    return <p className="rounded-xl bg-surface-2 p-4 text-fg-muted">{t("This doctor has no free times in the next 2 weeks. Please choose another doctor, or look again in a few days.")}</p>;
  }

  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 text-sm font-medium text-fg-muted">
        <Clock className="size-4 shrink-0" aria-hidden />
        {t("Times are in your local time ({zone}).", { zone })}
      </p>
      <div role="tablist" aria-label={t("Choose a day")} className="flex gap-2 overflow-x-auto pb-1">
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
            <span className={cn("text-xs", k === day ? "text-on-primary" : "text-fg-muted")}>{t("{n} free", { n: list.length })}</span>
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
                    className={cn("tap flex items-center justify-center rounded-xl border px-2 py-1.5 font-semibold", slot === s.id ? "border-primary bg-primary-soft text-primary-soft-fg ring-2 ring-primary" : "border-field bg-surface hover:border-primary")}
                  >
                    {fmtTime(s.startAt)}
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
      <div className={stickyAction ? "sticky bottom-0 -mx-4 border-t border-line bg-page/95 px-4 py-3 backdrop-blur" : undefined}>
        <Button size="lg" className="w-full" disabled={!slot} onClick={() => slot && router.push(`${nextHref}&slot=${slot}`)}>
          {t("Continue")}
        </Button>
        {!slot ? <p className="mt-2 text-center text-sm text-fg-muted">{t("Choose a time to continue.")}</p> : null}
      </div>
    </div>
  );
}
