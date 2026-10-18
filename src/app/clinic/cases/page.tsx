import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { listCasesForStaff } from "@/server/cases";
import { PageHeader } from "@/components/ui/page-header";
import { CaseList } from "@/components/cases/case-list";

export const metadata: Metadata = { title: "Treatment in India patients" };

export default async function ClinicCases() {
  const ctx = await getViewContext();
  const cases = await listCasesForStaff(ctx.user!);
  return (
    <div className="space-y-6">
      <PageHeader title={ctx.t("Treatment in India patients")} description={ctx.t("Review reports, send a plan with a cost estimate in the patient's currency, and issue medical visa letters.")} />
      <CaseList cases={cases} base="/clinic/cases" ctx={ctx} />
    </div>
  );
}
