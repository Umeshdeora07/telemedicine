import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { DemoBanner } from "@/components/layout/demo-banner";
import { BottomNav } from "@/components/layout/bottom-nav";
import { getUser } from "@/server/auth/session";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <>
      <DemoBanner />
      <SiteHeader />
      <main id="main" className="pb-20 md:pb-0">
        {children}
      </main>
      <SiteFooter />
      <BottomNav signedIn={Boolean(user)} />
    </>
  );
}
