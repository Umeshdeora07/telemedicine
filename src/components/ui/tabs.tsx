import Link from "next/link";
import { cn } from "@/lib/utils";

/** Tabs as links (each tab is a URL, so back/forward and sharing work). */
export function LinkTabs({ tabs, current, label }: { tabs: { href: string; label: string; key: string; count?: number }[]; current: string; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((t) => {
          const active = t.key === current;
          return (
            <li key={t.key}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "tap inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 font-medium",
                  active ? "border-primary text-primary" : "border-transparent text-fg-muted hover:text-fg",
                )}
              >
                {t.label}
                {t.count !== undefined ? <span className="rounded-full bg-surface-2 px-2 text-sm text-fg-muted">{t.count}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
