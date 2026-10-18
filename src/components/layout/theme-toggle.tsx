"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { setThemeAction } from "@/server/actions/prefs";
import { cn } from "@/lib/utils";

export type Theme = "light" | "dark";

/** Browser bar colour per theme (the header surface colour). Matches generateViewport in app/layout.tsx. */
const THEME_COLOR: Record<Theme, string> = { light: "#ffffff", dark: "#111b2e" };

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Switches the page at once, remembers the choice in a cookie and, when signed in, on the account. */
export function applyTheme(theme: Theme) {
  const html = document.documentElement;
  html.classList.toggle("dark", theme === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", theme);
  document.cookie = `pref_theme=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  void setThemeAction(theme);
}

/** The theme in use. `initial` is what the server rendered (from the cookie), so hydration matches. */
export function useTheme(initial: Theme): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => initial);
}

/** Sun and moon button: light by default, dark only when the visitor turns it on. */
export function ThemeToggle({ initial, className }: { initial: Theme; className?: string }) {
  const { t } = useI18n();
  const theme = useTheme(initial);
  const dark = theme === "dark";
  return (
    <button
      type="button"
      aria-pressed={dark}
      title={dark ? t("Switch to light mode") : t("Switch to dark mode")}
      onClick={() => applyTheme(dark ? "light" : "dark")}
      className={cn("tap inline-grid place-items-center rounded-xl text-fg hover:bg-surface-2", className)}
    >
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
      <span className="sr-only">{t("Dark mode")}</span>
    </button>
  );
}
