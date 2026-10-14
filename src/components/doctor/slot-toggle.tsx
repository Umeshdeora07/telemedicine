"use client";

import { useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { toggleSlotBlockAction } from "@/server/actions/doctor";
import { cn } from "@/lib/utils";

export function SlotToggle({ id, label, status, action = toggleSlotBlockAction }: { id: string; label: string; status: string; action?: (slotId: string, block: boolean) => Promise<void> }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const booked = status === "booked" || status === "held";
  return (
    <button
      type="button"
      disabled={booked || pending}
      aria-pressed={status === "blocked"}
      title={booked ? t("Booked") : status === "blocked" ? t("Blocked — tap to open") : t("Free — tap to block")}
      onClick={() => start(() => action(id, status !== "blocked"))}
      className={cn("tap rounded-lg border px-2 text-sm", booked ? "border-primary bg-primary text-on-primary" : status === "blocked" ? "border-line bg-surface-2 text-fg-muted line-through" : "border-field hover:border-primary")}
    >
      {label}
    </button>
  );
}
