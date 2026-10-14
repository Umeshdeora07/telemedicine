import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { DemoBanner } from "@/components/layout/demo-banner";
import { IdleLogout } from "@/components/layout/idle-logout";
import { RegionMenu } from "@/components/layout/region-menu";
import { PrefsMenu } from "@/components/layout/prefs-menu";
import { PortalNav } from "./portal-nav";
import { enabledLocales } from "@/i18n/config";
import { getViewContext } from "@/server/context";
import { InitialsAvatar } from "@/components/ui/avatar";

export type NavItem = { href: string; label: string; icon: string; badge?: number };

/** Shared shell for the doctor, clinic, coordinator and admin portals. */
export async function PortalShell({ title, nav, children, idleMinutes }: { title: string; nav: NavItem[]; children: ReactNode; idleMinutes: number }) {
  const ctx = await getViewContext();
  const { t, user } = ctx;
  return (
    <>
      <DemoBanner />
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4">
          <Logo href={nav[0]?.href ?? "/"} />
          <span className="hidden rounded-full bg-primary-soft px-2.5 py-0.5 text-sm font-semibold text-primary-soft-fg sm:inline">{title}</span>
          <div className="ms-auto flex items-center gap-1">
            <RegionMenu locales={enabledLocales()} currency={ctx.currency} />
            <PrefsMenu />
            <span className="hidden items-center gap-2 px-2 md:flex">
              <InitialsAvatar name={user?.name ?? "?"} size={32} />
              <span className="text-sm font-semibold">{user?.name}</span>
            </span>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="tap rounded-xl px-3 text-sm font-semibold text-danger hover:bg-danger-soft">{t("Log out")}</button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex">
        <PortalNav items={nav} label={title} />
        <main id="main" className="min-w-0 flex-1 px-4 pb-24 pt-6 lg:px-8">
          {children}
        </main>
      </div>
      <IdleLogout minutes={idleMinutes} />
      <footer className="sr-only"><Link href="/legal/privacy">{t("Privacy policy")}</Link></footer>
    </>
  );
}
