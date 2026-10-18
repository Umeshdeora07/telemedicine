"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NavLinks, type NavLink } from "./nav-links";
import { applyTheme, useTheme, type Theme } from "./theme-toggle";

/**
 * Menu button for screens below lg. Opens the same links as the desktop bar
 * in a side panel built on the native <dialog> (focus stays inside, Esc closes).
 */
export function MobileMenu({ links, signedIn, theme: initialTheme, className }: { links: NavLink[]; signedIn: boolean; theme: Theme; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const path = usePathname();
  const theme = useTheme(initialTheme);
  const [lastPath, setLastPath] = useState(path);

  // Close after navigating (also when the page changes from a link outside the panel).
  if (lastPath !== path) {
    setLastPath(path);
    if (open) setOpen(false);
  }

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    // Keep the page behind the panel from scrolling.
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // The button is hidden from lg up; close the panel if the window grows that wide.
  useEffect(() => {
    if (!open) return;
    const wide = matchMedia("(min-width: 64rem)");
    const onChange = () => {
      if (wide.matches) setOpen(false);
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, [open]);

  return (
    <div className={cn("lg:hidden", className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="site-menu"
        className="tap inline-grid place-items-center rounded-xl text-fg hover:bg-surface-2"
      >
        <Menu className="size-6" aria-hidden />
        <span className="sr-only">{t("Menu")}</span>
      </button>
      <dialog
        ref={ref}
        id="site-menu"
        aria-labelledby="site-menu-title"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // A click on the backdrop (outside the panel) closes it.
          if (e.target === e.currentTarget) setOpen(false);
        }}
        className="m-0 ms-auto h-dvh max-h-none w-[min(22rem,100vw)] max-w-none overflow-y-auto border-s border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/50"
      >
        <div className="flex min-h-full flex-col gap-6 px-4 pb-8 pt-3">
          <div className="flex items-center justify-between">
            <h2 id="site-menu-title" className="text-lg font-bold">
              {t("Menu")}
            </h2>
            <button type="button" onClick={() => setOpen(false)} className="tap -me-2 inline-grid place-items-center rounded-xl text-fg-muted hover:bg-surface-2">
              <X className="size-6" aria-hidden />
              <span className="sr-only">{t("Close menu")}</span>
            </button>
          </div>
          <nav aria-label={t("Main menu")}>
            <NavLinks links={links} variant="panel" onNavigate={() => setOpen(false)} />
          </nav>
          {signedIn ? null : (
            <div className="grid gap-2">
              <ButtonLink href="/doctors" size="lg" onClick={() => setOpen(false)}>
                {t("Book a consultation")}
              </ButtonLink>
              <ButtonLink href="/login" variant="outline" size="lg" onClick={() => setOpen(false)}>
                {t("Log in")}
              </ButtonLink>
            </div>
          )}
          <div className="mt-auto flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-2">
            <span id="site-menu-dark" className="font-medium">
              {t("Dark mode")}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={theme === "dark"}
              aria-labelledby="site-menu-dark"
              onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
              className="tap inline-flex items-center"
            >
              <span className={cn("relative inline-block h-7 w-12 rounded-full transition-colors", theme === "dark" ? "bg-primary" : "bg-field")}>
                <span className={cn("absolute top-1 size-5 rounded-full bg-surface shadow transition-[inset-inline-start]", theme === "dark" ? "start-6" : "start-1")} />
              </span>
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
