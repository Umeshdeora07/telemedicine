import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { listCasesForPatientUser } from "@/server/cases";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { CaseList } from "@/components/cases/case-list";

export const metadata: Metadata = { title: "My treatment plans" };

export default async function MyCases() {
  const ctx = await getViewContext();
  const cases = await listCasesForPatientUser(ctx.user!.id);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={ctx.t("My treatment plans")} description={ctx.t("Follow your treatment in India in one place: your plan and cost estimate, visa letter, travel and follow up.")} actions={<ButtonLink href="/international/new">{ctx.t("Get a treatment plan")}</ButtonLink>} />
      <CaseList cases={cases} base="/international/cases" ctx={ctx} />
    </div>
  );
}
