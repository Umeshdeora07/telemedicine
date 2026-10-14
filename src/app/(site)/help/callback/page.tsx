import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { SPOKEN_LANGUAGES } from "@/config/languages";
import { PageHeader } from "@/components/ui/page-header";
import { CallbackForm } from "@/components/support/support-forms";

export const metadata: Metadata = { title: "Request a call back" };

export default async function CallbackPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const sp = await searchParams;
  const { t, user, locale } = await getViewContext();
  return (
    <div className="container-page max-w-2xl space-y-6 py-8">
      <PageHeader title={t("Talk to a care coordinator")} description={t("Not comfortable booking online? Tell us when to call. We'll help you find the right doctor and book — in your language.")} />
      <div className="card p-5">
        <CallbackForm reason={sp.reason} defaults={{ name: user?.name ?? "", phone: user?.phone ?? "", language: user?.language ?? locale }} languages={Object.entries(SPOKEN_LANGUAGES).map(([code, name]) => ({ code, name }))} />
      </div>
    </div>
  );
}
