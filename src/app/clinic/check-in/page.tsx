import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { PageHeader } from "@/components/ui/page-header";
import { CheckInPanel } from "@/components/clinic/check-in-panel";

export const metadata: Metadata = { title: "Check in" };

export default async function CheckInPage({ searchParams }: { searchParams: Promise<{ pass?: string }> }) {
  const { t } = await getViewContext();
  const { pass } = await searchParams;
  return (
    <div className="space-y-6">
      <PageHeader title={t("Check in a patient")} description={t("Scan the QR code on the patient's visit pass, or type the 6-character code.")} />
      <CheckInPanel initialToken={pass} />
    </div>
  );
}
