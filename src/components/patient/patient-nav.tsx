"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** The patient portal menu, shown under the header from tablet width. Phones use the bottom navigation and the Profile page. */
export function PatientNav() {
  const { t } = useI18n();
  const path = usePathname();
  const items = [
    { href: "/dashboard", label: t("Dashboard"), match: ["/dashboard"] },
    { href: "/consults", label: t("My consultations"), match: ["/consults"] },
    { href: "/international/cases", label: t("My treatment plans"), match: ["/international"] },
    { href: "/records", label: t("Records and prescriptions"), match: ["/records", "/prescriptions"] },
    { href: "/invoices", label: t("Payments"), match: ["/invoices"] },
    { href: "/settings", label: t("Settings"), match: ["/settings"] },
  ];
  return (
    <nav aria-label={t("Your account")} className="hidden border-b border-line bg-surface md:block">
      <ul className="container-page flex gap-1 overflow-x-auto">
        {items.map((i) => {
          const active = i.match.some((m) => path === m || path.startsWith(`${m}/`));
          return (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "tap inline-flex items-center border-b-2 px-3 font-semibold whitespace-nowrap",
                  active ? "border-primary text-primary" : "border-transparent text-fg-muted hover:text-heading",
                )}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
