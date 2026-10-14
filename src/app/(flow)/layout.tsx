import { SiteHeader } from "@/components/layout/site-header";
import { DemoBanner } from "@/components/layout/demo-banner";

/** Booking and payment: no footer or bottom bar, one primary action per screen. */
export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoBanner />
      <SiteHeader minimal />
      <main id="main" className="container-page max-w-3xl py-6 sm:py-10">
        {children}
      </main>
    </>
  );
}
