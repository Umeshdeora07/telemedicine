"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { saveRulesAction } from "@/server/actions/doctor";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { COMMON_TIME_ZONES } from "@/lib/time";

type Rule = { key: string; group: "online" | "in_clinic"; clinicId: string | null; weekday: number; startTime: string; endTime: string; slotMinutes: number };

export function ScheduleEditor({ initial, timeZone, clinics, defaultSlot }: { initial: Omit<Rule, "key">[]; timeZone: string; clinics: { id: string; name: string }[]; defaultSlot: number }) {
  const { t, intl } = useI18n();
  const [rules, setRules] = useState<Rule[]>(initial.map((r) => ({ ...r, key: crypto.randomUUID() })));
  const [tz, setTz] = useState(timeZone);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const days = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(intl, { weekday: "long" }).format(new Date(Date.UTC(2024, 0, 7 + i))));
  const update = (key: string, patch: Partial<Rule>) => setRules((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-4">
      <div className="max-w-xs space-y-1">
        <label htmlFor="tz" className="text-sm font-medium">{t("Your time zone")}</label>
        <Select id="tz" value={tz} onChange={(e) => setTz(e.target.value)}>
          {Array.from(new Set([tz, ...COMMON_TIME_ZONES])).map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
        </Select>
        <p className="text-sm text-fg-muted">{t("Patients see these times converted to their own zone.")}</p>
      </div>
      {days.map((label, wd) => {
        const list = rules.filter((r) => r.weekday === wd);
        return (
          <fieldset key={wd} className="card space-y-2 p-4">
            <legend className="px-1 font-bold">{label}</legend>
            {list.length ? null : <p className="text-sm text-fg-muted">{t("Not available")}</p>}
            {list.map((r) => (
              <div key={r.key} className="flex flex-wrap items-end gap-2">
                <Select value={r.group === "online" ? "online" : r.clinicId ?? ""} onChange={(e) => update(r.key, e.target.value === "online" ? { group: "online", clinicId: null } : { group: "in_clinic", clinicId: e.target.value })} aria-label={t("Where")} className="w-48">
                  <option value="online">{t("Online")}</option>
                  {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Input type="time" value={r.startTime} onChange={(e) => update(r.key, { startTime: e.target.value })} aria-label={t("From")} className="w-32" />
                <span aria-hidden>–</span>
                <Input type="time" value={r.endTime} onChange={(e) => update(r.key, { endTime: e.target.value })} aria-label={t("To")} className="w-32" />
                <Select value={String(r.slotMinutes)} onChange={(e) => update(r.key, { slotMinutes: Number(e.target.value) })} aria-label={t("Slot length")} className="w-32">
                  {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{t("{n} min slots", { n: m })}</option>)}
                </Select>
                <button type="button" onClick={() => setRules((rs) => rs.filter((x) => x.key !== r.key))} className="tap grid place-items-center rounded-lg text-fg-muted hover:text-danger" aria-label={t("Remove")}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setRules((rs) => [...rs, { key: crypto.randomUUID(), group: "online", clinicId: null, weekday: wd, startTime: "09:00", endTime: "12:00", slotMinutes: defaultSlot }])} className="tap inline-flex items-center gap-1 text-sm font-semibold text-primary">
              <Plus className="size-4" aria-hidden />
              {t("Add hours")}
            </button>
          </fieldset>
        );
      })}
      {msg ? <p role="status" className={msg.ok ? "text-success" : "text-danger"}>{msg.text}</p> : null}
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await saveRulesAction(rules.map(({ key: _k, ...x }) => x), tz);
            setMsg(r.ok ? { ok: true, text: t("Saved. Free slots for the next 3 weeks have been updated; booked consults are not affected.") } : { ok: false, text: r.error });
          })
        }
      >
        {t("Save availability")}
      </Button>
    </div>
  );
}
