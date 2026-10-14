"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, FolderHeart, Home, Search, UserRound } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** Mobile bottom navigation: Home, Search, Consults, Records, Profile. */
export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  const path = usePathname();
  const items = [
    { href: signedIn ? "/dashboard" : "/", label: t("Home"), Icon: Home, match: (p: string) => p === "/" || p === "/dashboard" },
    { href: "/doctors", label: t("Search"), Icon: Search, match: (p: string) => p.startsWith("/doctors") || p.startsWith("/specialties") },
    { href: "/consults", label: t("Consults"), Icon: CalendarCheck, match: (p: string) => p.startsWith("/consults") || p.startsWith("/consult/") },
    { href: "/records", label: t("Records"), Icon: FolderHeart, match: (p: string) => p.startsWith("/records") || p.startsWith("/prescriptions") },
    { href: "/profile", label: t("Profile"), Icon: UserRound, match: (p: string) => p.startsWith("/profile") || p.startsWith("/settings") || p.startsWith("/family") },
  ];
  return (
    <nav aria-label={t("Main")} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-15 flex-col items-center justify-center gap-0.5 text-xs font-medium", active ? "text-primary" : "text-fg-muted")}
              >
                <Icon className={cn("size-6", active && "stroke-[2.4]")} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
