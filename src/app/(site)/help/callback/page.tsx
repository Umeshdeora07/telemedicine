import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { getViewContext } from "@/server/context";
import { PageHeader } from "@/components/ui/page-header";
import { CallbackForm } from "@/components/support/support-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Request a call back") };
}

export default async function CallbackPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const sp = await searchParams;
  const { t, user, locale } = await getViewContext();
  return (
    <div className="container-page max-w-2xl space-y-6 py-8">
      <PageHeader
        title={t("Request a call back")}
        description={t("Tell us when to call. We will help you choose a doctor, book a consultation or plan your treatment in India.")}
      />
      <div className="card p-5 sm:p-6">
        <CallbackForm
          reason={sp.reason}
          defaults={{ name: user?.name ?? "", phone: user?.phone ?? "", language: user?.language === "hi" || locale === "hi" ? "hi" : "en" }}
          languages={[
            { code: "en", name: "English" },
            { code: "hi", name: "Hindi" },
          ]}
        />
      </div>
    </div>
  );
}
