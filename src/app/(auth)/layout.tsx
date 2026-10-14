import { SiteHeader } from "@/components/layout/site-header";
import { DemoBanner } from "@/components/layout/demo-banner";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoBanner />
      <SiteHeader minimal />
      <main id="main" className="container-page py-8 sm:py-12">
        {children}
      </main>
    </>
  );
}
