import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";
import { enabledLocales } from "@/i18n/config";
import { getSession } from "@/server/auth/session";
import { homeFor, isStaff, ROLE_LABELS, type Role } from "@/server/auth/roles";
import { getPrefs } from "@/lib/prefs";
import { maskPhone } from "@/lib/utils";
import { getDb } from "@/db";
import { unreadCount } from "@/server/notify";
import { LanguageToggle } from "./language-toggle";
import { MobileMenu } from "./mobile-menu";
import { NavLinks, type NavLink } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

/**
 * Site header: logo, main links, language and theme switches, and either
 * Log in with "Book a consultation" or the account menu. Below lg the links
 * move into a menu panel. `minimal` (sign in, booking and payment) keeps
 * only the logo, the switches and the account menu.
 */
export async function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  const { t } = await getI18n();
  const session = await getSession();
  const user = session?.user ?? null;
  const { theme } = await getPrefs();
  const unread = user ? await unreadCount(await getDb(), user.id) : 0;
  const staff = user ? isStaff(user.role) : false;
  const locales = enabledLocales();

  const nav: NavLink[] = [
    { href: "/online-consultation", label: t("Online consultation") },
    { href: "/treatment-in-india", label: t("Treatment in India") },
    { href: "/doctors", label: t("Our doctors"), also: ["/specialties"] },
    { href: "/about", label: t("About us") },
    { href: "/contact", label: t("Contact") },
  ];

  const userLinks = user
    ? staff
      ? [
          { href: homeFor(user.role), label: t("My portal") },
          { href: "/password", label: t("Password") },
        ]
      : [
          { href: "/dashboard", label: t("Dashboard") },
          { href: "/consults", label: t("My consultations") },
          { href: "/international/cases", label: t("My treatment plans") },
          { href: "/records", label: t("Records and prescriptions") },
          { href: "/invoices", label: t("Payments") },
          { href: "/settings", label: t("Settings") },
          { href: "/password", label: t("Password") },
        ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-4 sm:px-6 lg:gap-4">
        <Logo href={user && !staff ? "/dashboard" : user ? homeFor(user.role) : "/"} className="min-w-0 shrink" />
        {!minimal ? (
          <nav aria-label={t("Main menu")} className="hidden lg:block">
            <NavLinks links={nav} variant="bar" />
          </nav>
        ) : null}
        <div className="ms-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <LanguageToggle locales={locales} />
          <ThemeToggle initial={theme} className={minimal ? undefined : "hidden sm:inline-grid"} />
          {user ? (
            <UserMenu name={user.name || user.email || maskPhone(user.phone) || t("You")} avatarName={user.name} role={t(ROLE_LABELS[user.role as Role])} links={userLinks} unread={unread} />
          ) : minimal ? null : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                {t("Log in")}
              </ButtonLink>
              <ButtonLink href="/doctors" size="sm" className="ms-1 hidden md:inline-flex lg:hidden xl:inline-flex">
                {t("Book a consultation")}
              </ButtonLink>
            </>
          )}
          {!minimal ? <MobileMenu links={nav} signedIn={Boolean(user)} theme={theme} /> : null}
        </div>
      </div>
    </header>
  );
}
