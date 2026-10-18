"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Bell, LogOut } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { InitialsAvatar } from "@/components/ui/avatar";

export type UserMenuLink = { href: string; label: string };

/** Notifications bell and the account menu for signed in people. */
/** `avatarName`: the person's real name for the initials; empty shows a person icon. */
export function UserMenu({ name, avatarName, role, links, unread }: { name: string; avatarName?: string; role: string; links: UserMenuLink[]; unread: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const path = usePathname();
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const notificationsLabel = unread ? t("Notifications ({count} new)", { count: unread }) : t("Notifications");
  return (
    <div className="flex items-center gap-0.5 sm:gap-1" ref={ref}>
      <Link href="/notifications" className="tap relative hidden place-items-center rounded-xl text-fg hover:bg-surface-2 sm:grid" aria-label={notificationsLabel}>
        <Bell className="size-5" aria-hidden />
        {unread ? <span className="absolute end-1.5 top-1.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent">{unread}</span> : null}
      </Link>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={menuId}
          className="tap relative flex items-center gap-2 rounded-xl px-1.5 hover:bg-surface-2"
        >
          <InitialsAvatar name={avatarName ?? name} size={36} />
          {unread ? <span className="absolute end-1 top-1 size-2.5 rounded-full bg-accent ring-2 ring-surface sm:hidden" aria-hidden /> : null}
          <span className="sr-only">{t("Account menu for {name}", { name })}</span>
        </button>
        {open ? (
          <div id={menuId} className="card absolute end-0 top-12 z-50 w-64 p-2">
            <p className="px-3 pb-2 pt-1">
              <span className="block truncate font-semibold text-heading">{name}</span>
              <span className="text-sm text-fg-muted">{role}</span>
            </p>
            <ul>
              <li className="sm:hidden">
                <Link href="/notifications" onClick={() => setOpen(false)} className="tap flex items-center justify-between gap-2 rounded-lg px-3 hover:bg-surface-2">
                  {t("Notifications")}
                  {unread ? <span className="grid min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-on-accent">{unread}</span> : null}
                </Link>
              </li>
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={path === l.href || path.startsWith(`${l.href}/`) ? "page" : undefined}
                    className="tap flex items-center rounded-lg px-3 hover:bg-surface-2 aria-[current=page]:font-semibold aria-[current=page]:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li className="mt-1 border-t border-line pt-1">
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
