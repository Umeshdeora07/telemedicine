"use client";

import { useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { setAvailableNowAction } from "@/server/actions/doctor";
import { runningLateAction } from "@/server/actions/doctor-consult";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

export function AvailableToggle({ on, until }: { on: boolean; until: string | null }) {
  const { t, intl } = useI18n();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant={on ? "secondary" : "primary"} disabled={pending} onClick={() => start(() => setAvailableNowAction(!on))} aria-pressed={on}>
        <span className={`size-2.5 rounded-full ${on ? "bg-success" : "bg-field"}`} aria-hidden />
        {on ? t("Available for Consult now") : t("Go online for Consult now")}
      </Button>
      {on && until ? <span className="text-sm text-fg-muted">{t("Until {time}", { time: new Intl.DateTimeFormat(intl, { hour: "numeric", minute: "2-digit" }).format(new Date(until)) })}</span> : null}
    </div>
  );
}

export function RunningLate({ minutes }: { minutes: number }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="late" className="text-sm font-medium">{t("Running late?")}</label>
      <Select id="late" className="w-auto" disabled={pending} defaultValue={String(minutes)} onChange={(e) => start(() => runningLateAction(Number(e.target.value)))}>
        <option value="0">{t("On time")}</option>
        {[5, 10, 15, 20, 30].map((m) => <option key={m} value={m}>{t("{n} min late", { n: m })}</option>)}
      </Select>
    </div>
  );
}
