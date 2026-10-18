"use client";

import { useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { runningLateAction } from "@/server/actions/doctor-consult";
import { Select } from "@/components/ui/field";

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
