"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, LogOut } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { InitialsAvatar } from "@/components/ui/avatar";

export function UserMenu({ name, role, links, unread }: { name: string; role: string; links: { href: string; label: string }[]; unread: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
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
    <div className="flex items-center gap-1" ref={ref}>
      <Link href="/notifications" className="tap relative grid place-items-center rounded-xl hover:bg-surface-2" aria-label={unread ? t("Notifications ({count} new)", { count: unread }) : t("Notifications")}>
        <Bell className="size-5" aria-hidden />
        {unread ? <span className="absolute end-1.5 top-1.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent">{unread}</span> : null}
      </Link>
      <div className="relative">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="tap flex items-center gap-2 rounded-xl px-1.5 hover:bg-surface-2">
          <InitialsAvatar name={name} size={36} />
          <span className="sr-only">{t("Account menu for {name}", { name })}</span>
        </button>
        {open ? (
          <div className="card absolute end-0 top-12 z-50 w-60 p-2">
            <p className="px-3 pb-2 pt-1">
              <span className="block font-semibold text-heading">{name}</span>
              <span className="text-sm text-fg-muted">{role}</span>
            </p>
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={() => setOpen(false)} className="tap flex items-center rounded-lg px-3 hover:bg-surface-2">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="tap flex w-full items-center gap-2 rounded-lg px-3 text-danger hover:bg-danger-soft">
                    <LogOut className="size-4" aria-hidden />
                    {t("Log out")}
                  </button>
                </form>
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
