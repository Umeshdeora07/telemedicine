import { SiteHeader } from "@/components/layout/site-header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader minimal />
      <main id="main" className="container-page py-8 sm:py-12">
        {children}
      </main>
    </>
  );
}
