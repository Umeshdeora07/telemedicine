"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavLink = { href: string; label: string; /** Other path prefixes that count as this section. */ also?: string[] };

function under(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function isActive(path: string, link: NavLink) {
  return [link.href, ...(link.also ?? [])].some((p) => under(path, p));
}

/** Main site links with aria-current on the section you are in. */
export function NavLinks({ links, variant, onNavigate }: { links: NavLink[]; variant: "bar" | "panel"; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <ul className={variant === "bar" ? "flex items-center gap-0.5" : "space-y-1"}>
      {links.map((l) => {
        const active = isActive(path, l);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "tap inline-flex items-center rounded-lg font-medium",
                variant === "bar"
                  ? "whitespace-nowrap px-2 text-sm hover:bg-surface-2 hover:text-heading xl:px-2.5 xl:text-[0.9375rem]"
                  : "w-full px-3 text-lg hover:bg-surface-2",
                active ? "text-primary" : "text-fg",
                active && variant === "panel" && "bg-primary-soft text-primary-soft-fg",
              )}
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
