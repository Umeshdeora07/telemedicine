"use client";

import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { toggleSavedDoctor } from "@/server/actions/patient";
import { cn } from "@/lib/utils";

export function SaveDoctorButton({ doctorId, saved }: { doctorId: string; saved: boolean }) {
  const { t } = useI18n();
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          await toggleSavedDoctor(doctorId);
        })
      }
      className={cn("tap inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold", optimistic ? "border-danger/40 bg-danger-soft text-danger" : "border-line hover:bg-surface-2")}
    >
      <Heart className={cn("size-4", optimistic && "fill-current")} aria-hidden />
      {optimistic ? t("Saved") : t("Save")}
    </button>
  );
}
