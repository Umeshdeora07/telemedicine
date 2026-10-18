"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { CURRENCIES, CURRENCY_CODES, type Currency } from "@/config/currencies";
import { setCurrencyAction } from "@/server/actions/prefs";
import { cn } from "@/lib/utils";

/** "Prices shown in" select for the footer. */
export function CurrencySelect({ currency, className }: { currency: Currency; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const id = useId();
  const [pending, start] = useTransition();
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {t("Prices shown in")}
      </label>
      <select
        id={id}
        key={currency}
        defaultValue={currency}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          start(async () => {
            await setCurrencyAction(next);
            router.refresh();
          });
        }}
        className="tap rounded-lg border border-field bg-surface px-3 text-sm text-fg disabled:opacity-60"
      >
        {CURRENCY_CODES.map((c) => (
          <option key={c} value={c}>
            {t(CURRENCIES[c].name)} ({c})
          </option>
        ))}
      </select>
    </div>
  );
}
