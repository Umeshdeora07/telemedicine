import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { listCasesForPatientUser } from "@/server/cases";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { CaseList } from "@/components/cases/case-list";

export const metadata: Metadata = { title: "Treatment in India" };

export default async function MyCases() {
  const ctx = await getViewContext();
  const cases = await listCasesForPatientUser(ctx.user!.id);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={ctx.t("Treatment in India")} description={ctx.t("Track your plan, estimate, visa letter, travel and treatment in one place.")} actions={<ButtonLink href="/international/new">{ctx.t("New enquiry")}</ButtonLink>} />
      <CaseList cases={cases} base="/international/cases" ctx={ctx} />
    </div>
  );
}
