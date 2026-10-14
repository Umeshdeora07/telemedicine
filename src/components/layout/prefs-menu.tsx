"use client";

import { useEffect, useRef, useState } from "react";
import { Accessibility, Check } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { savePreferencesAction } from "@/server/actions/prefs";
import { cn } from "@/lib/utils";

type Key = "theme" | "text" | "contrast" | "motion";
const YEAR = 60 * 60 * 24 * 365;

function readCookie(name: string) {
  return document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1];
}

export function applyPreference(key: Key, value: string) {
  const html = document.documentElement;
  document.cookie = `pref_${key}=${value}; path=/; max-age=${YEAR}; samesite=lax`;
  if (key === "theme") {
    const dark = value === "dark" || (value === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    html.classList.toggle("dark", dark);
  }
  if (key === "text") {
    html.classList.toggle("lt", value === "large");
    html.classList.toggle("xlt", value === "xlarge");
  }
  if (key === "contrast") html.classList.toggle("hc", value === "high");
  if (key === "motion") html.classList.toggle("rm", value === "reduce");
}

/** Text size, contrast, theme and motion — one tap away on every page. */
export function PrefsMenu({ className }: { className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Record<Key, string>>({ theme: "system", text: "normal", contrast: "normal", motion: "system" });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setState({
      theme: readCookie("pref_theme") ?? "system",
      text: readCookie("pref_text") ?? "normal",
      contrast: readCookie("pref_contrast") ?? "normal",
      motion: readCookie("pref_motion") ?? "system",
    });
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

  const set = (key: Key, value: string) => {
    applyPreference(key, value);
    setState((s) => ({ ...s, [key]: value }));
    void savePreferencesAction({ [key]: value });
  };

  const groups: { key: Key; label: string; options: [string, string][] }[] = [
    { key: "text", label: t("Text size"), options: [["normal", t("Normal")], ["large", t("Large")], ["xlarge", t("Extra large")]] },
    { key: "contrast", label: t("Contrast"), options: [["normal", t("Normal")], ["high", t("High contrast")]] },
    { key: "theme", label: t("Appearance"), options: [["system", t("Same as device")], ["light", t("Light")], ["dark", t("Dark")]] },
    { key: "motion", label: t("Motion"), options: [["system", t("Same as device")], ["reduce", t("Reduce motion")]] },
  ];

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={t("Text size, contrast and theme")}
        className="tap inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 text-fg hover:bg-surface-2"
      >
        <Accessibility className="size-5" aria-hidden />
        <span className="sr-only 2xl:not-sr-only 2xl:text-sm 2xl:font-medium">{t("Display")}</span>
      </button>
      {open ? (
        <div role="dialog" aria-label={t("Display settings")} className="card absolute end-0 top-12 z-50 w-72 space-y-4 p-4">
          {groups.map((g) => (
            <fieldset key={g.key}>
              <legend className="mb-1.5 text-sm font-semibold text-heading">{g.label}</legend>
              <div className="flex flex-wrap gap-1.5">
                {g.options.map(([v, label]) => {
                  const active = state[g.key] === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={active}
                      onClick={() => set(g.key, v)}
                      className={cn(
                        "tap inline-flex items-center gap-1 rounded-lg border px-3 text-sm",
                        active ? "border-primary bg-primary-soft font-semibold text-primary-soft-fg" : "border-line hover:bg-surface-2",
                      )}
                    >
                      {active ? <Check className="size-4" aria-hidden /> : null}
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}
    </div>
  );
}
