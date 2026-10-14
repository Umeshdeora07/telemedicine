import Link from "next/link";
import { Siren } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";
import { enabledLocales } from "@/i18n/config";
import { getSession } from "@/server/auth/session";
import { homeFor, isStaff, ROLE_LABELS, type Role } from "@/server/auth/roles";
import { getViewerRegion } from "@/lib/prefs";
import { getDb } from "@/db";
import { unreadCount } from "@/server/notify";
import { PrefsMenu } from "./prefs-menu";
import { RegionMenu } from "./region-menu";
import { UserMenu } from "./user-menu";

export async function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  const { t } = await getI18n();
  const session = await getSession();
  const user = session?.user ?? null;
  const { currency } = await getViewerRegion(user);
  const unread = user ? await unreadCount(await getDb(), user.id) : 0;
  const staff = user ? isStaff(user.role) : false;

  const nav = [
    { href: "/doctors", label: t("Find a doctor") },
    { href: "/specialties", label: t("Specialties") },
    { href: "/hospitals", label: t("Hospitals") },
    { href: "/international", label: t("International") },
    { href: "/help", label: t("Help"), wide: true },
  ];

  const userLinks = user
    ? staff
      ? [{ href: homeFor(user.role), label: t("My portal") }]
      : [
          { href: "/dashboard", label: t("Dashboard") },
          { href: "/consults", label: t("My consults") },
          { href: "/records", label: t("Health records") },
          { href: "/family", label: t("Family members") },
          { href: "/settings", label: t("Settings") },
        ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-3">
        <Logo href={user && !staff ? "/dashboard" : user ? homeFor(user.role) : "/"} />
        {!minimal ? (
          <nav aria-label={t("Primary")} className="ms-2 hidden lg:block">
            <ul className="flex items-center gap-1">
              {nav.map((n) => (
                <li key={n.href} className={"wide" in n ? "hidden xl:block" : undefined}>
                  <Link href={n.href} className="tap inline-flex items-center whitespace-nowrap rounded-lg px-2.5 font-medium text-fg hover:bg-surface-2">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <div className="ms-auto flex items-center gap-0.5 sm:gap-1">
          <Link
            href="/emergency"
            className="tap inline-flex items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-danger hover:bg-danger-soft"
          >
            <Siren className="size-5" aria-hidden />
            <span className="hidden xl:inline">{t("Emergency")}</span>
            <span className="sr-only xl:hidden">{t("Emergency help")}</span>
          </Link>
          <RegionMenu locales={enabledLocales()} currency={currency} />
          <PrefsMenu className="hidden sm:block" />
          {user ? (
            <UserMenu name={user.name || t("You")} role={t(ROLE_LABELS[user.role as Role])} links={userLinks} unread={unread} />
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                {t("Log in")}
              </ButtonLink>
              <ButtonLink href="/consult-now" size="sm" className="hidden md:inline-flex">
                {t("Consult now")}
              </ButtonLink>
              <ButtonLink href="/login" size="sm" className="sm:hidden">
                {t("Log in")}
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
