"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { LOCALES, type Locale } from "@/i18n/config";
import { CURRENCIES, type Currency } from "@/config/currencies";
import { setCurrencyAction, setLocaleAction } from "@/server/actions/prefs";
import { cn } from "@/lib/utils";

/** Language switch in the header, with display currency. */
export function RegionMenu({ locales, currency }: { locales: Locale[]; currency: Currency }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("Language and currency")}
        className="tap inline-flex items-center gap-1.5 rounded-xl px-2 text-fg hover:bg-surface-2 sm:px-2.5"
      >
        <Globe className="size-5" aria-hidden />
        <span className="hidden text-sm font-semibold sm:inline">{LOCALES[locale].native}</span>
        <span className="text-sm font-semibold uppercase max-[399px]:sr-only sm:hidden">{locale}</span>
      </button>
      {open ? (
        <div role="dialog" aria-label={t("Language and currency")} className={cn("card absolute end-0 top-12 z-50 w-64 space-y-4 p-4", pending && "opacity-70")}>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-heading">{t("Language")}</legend>
            <div className="grid gap-1.5">
              {locales.map((l) => (
                <button
                  key={l}
                  type="button"
                  lang={l}
                  aria-pressed={l === locale}
                  onClick={() =>
                    start(async () => {
                      await setLocaleAction(l);
                      setOpen(false);
                      router.refresh();
                    })
                  }
                  className={cn(
                    "tap flex items-center justify-between rounded-lg border px-3 text-start",
                    l === locale ? "border-primary bg-primary-soft font-semibold text-primary-soft-fg" : "border-line hover:bg-surface-2",
                  )}
                >
                  <span>{LOCALES[l].native}</span>
                  <span className="text-sm text-fg-muted">{LOCALES[l].english}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="currency-select" className="mb-1.5 block text-sm font-semibold text-heading">
              {t("Show prices in")}
            </label>
            <select
              id="currency-select"
              defaultValue={currency}
              onChange={(e) =>
                start(async () => {
                  await setCurrencyAction(e.target.value);
                  router.refresh();
                })
              }
              className="tap w-full rounded-lg border border-field bg-surface px-3"
            >
              {(Object.keys(CURRENCIES) as Currency[]).map((c) => (
                <option key={c} value={c}>
                  {c} — {CURRENCIES[c].name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
