"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Coins,
  FileSearch,
  Globe,
  Home,
  LifeBuoy,
  ListChecks,
  MessageSquare,
  Newspaper,
  PhoneCall,
  QrCode,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Star,
  Stethoscope,
  Ticket,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "./portal-shell";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  calendar: CalendarDays,
  user: UserRound,
  users: Users,
  coins: Coins,
  star: Star,
  badge: BadgeCheck,
  file: FileSearch,
  message: MessageSquare,
  building: Building2,
  qr: QrCode,
  receipt: Receipt,
  globe: Globe,
  phone: PhoneCall,
  list: ListChecks,
  chart: BarChart3,
  scroll: ScrollText,
  news: Newspaper,
  ticket: Ticket,
  settings: Settings,
  shield: ShieldCheck,
  help: LifeBuoy,
  clipboard: ClipboardList,
  stethoscope: Stethoscope,
};

export function PortalNav({ items, label }: { items: NavItem[]; label: string }) {
  const path = usePathname();
  const active = (href: string) => (href.split("/").length <= 2 ? path === href : path.startsWith(href));
  return (
    <>
      <nav aria-label={label} className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 overflow-y-auto border-e border-line bg-surface p-3 lg:block">
        <ul className="space-y-1">
          {items.map((i) => {
            const Icon = ICONS[i.icon] ?? Home;
            return (
              <li key={i.href}>
                <Link href={i.href} aria-current={active(i.href) ? "page" : undefined} className={cn("tap flex items-center gap-3 rounded-xl px-3 font-medium", active(i.href) ? "bg-primary-soft text-primary-soft-fg" : "text-fg hover:bg-surface-2")}>
                  <Icon className="size-5" aria-hidden />
                  <span className="flex-1">{i.label}</span>
                  {i.badge ? <span className="rounded-full bg-accent px-2 text-xs font-bold text-on-accent">{i.badge}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-40 overflow-x-auto border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="flex min-w-max">
          {items.map((i) => {
            const Icon = ICONS[i.icon] ?? Home;
            return (
              <li key={i.href}>
                <Link href={i.href} aria-current={active(i.href) ? "page" : undefined} className={cn("relative flex min-h-15 min-w-20 flex-col items-center justify-center gap-0.5 px-2 text-xs font-medium", active(i.href) ? "text-primary" : "text-fg-muted")}>
                  <Icon className="size-5" aria-hidden />
                  {i.label}
                  {i.badge ? <span className="absolute end-2 top-1.5 rounded-full bg-accent px-1.5 text-[0.65rem] font-bold text-on-accent">{i.badge}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
