import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { getCountries } from "@/server/queries/reference";
import { PageHeader } from "@/components/ui/page-header";
import { AddFamilyForm } from "@/components/patient/family-tools";

export const metadata: Metadata = { title: "Add family member" };

export default async function NewFamily({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t } = ctx;
  const countries = await getCountries();
  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title={t("Add a family member")} description={t("Their records stay theirs. You only see what they allow, and they can remove you any time.")} />
      <div className="card p-5">
        <AddFamilyForm countries={countries.map((c) => ({ code: c.code, name: c.name }))} defaultCountry="IN" pendingLinkId={sp.link && /^[0-9a-f-]{36}$/.test(sp.link) ? sp.link : undefined} />
      </div>
    </div>
  );
}
