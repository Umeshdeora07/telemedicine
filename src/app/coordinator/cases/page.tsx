import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { listCasesForStaff } from "@/server/cases";
import { PageHeader } from "@/components/ui/page-header";
import { CaseList } from "@/components/cases/case-list";

export const metadata: Metadata = { title: "International cases" };

export default async function CoordinatorCases() {
  const ctx = await getViewContext();
  const cases = await listCasesForStaff(ctx.user!);
  return (
    <div className="space-y-6">
      <PageHeader title={ctx.t("International cases")} description={ctx.t("Check reports are complete, route to the right hospital and doctor, and plan travel, stay and interpreters.")} />
      <CaseList cases={cases} base="/coordinator/cases" ctx={ctx} />
    </div>
  );
}
