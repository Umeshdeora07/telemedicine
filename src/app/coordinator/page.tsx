import type { Metadata } from "next";
import Link from "next/link";
import { getViewContext } from "@/server/context";
import { callbackQueue, interpreterQueue } from "@/server/coordinator";
import { listCasesForStaff } from "@/server/cases";
import { PageHeader } from "@/components/ui/page-header";
import { CaseList } from "@/components/cases/case-list";

export const metadata: Metadata = { title: "Care team" };

export default async function CoordinatorHome() {
  const ctx = await getViewContext();
  const { t, user } = ctx;
  const [cb, iq, cases] = await Promise.all([callbackQueue(), interpreterQueue(), listCasesForStaff(user!)]);
  const open = cases.filter((c) => !["closed"].includes(c.c.status));
  return (
    <div className="space-y-6">
      <PageHeader title={t("Hello, {name}", { name: user!.name.split(" ")[0] ?? "" })} description={t("Callbacks within 30 minutes in working hours. Every international enquiry gets a reply within 24 hours.")} />
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [t("Callbacks waiting"), cb.filter((c) => c.status === "open").length, "/coordinator/callbacks"],
          [t("Calls in progress"), cb.filter((c) => c.status === "in_progress").length, "/coordinator/callbacks"],
          [t("Interpreters to arrange"), iq.filter((q) => !q.a.interpreterId).length, "/coordinator/interpreters"],
          [t("Open international cases"), open.length, "/coordinator/cases"],
        ].map(([k, v, href]) => (
          <Link key={String(k)} href={String(href)} className="card p-4 hover:border-primary">
            <dt className="text-sm text-fg-muted">{k}</dt>
            <dd className="text-3xl font-extrabold text-heading">{v}</dd>
          </Link>
        ))}
      </dl>
      <section className="space-y-3" aria-labelledby="cases">
        <h2 id="cases" className="text-lg font-bold">{t("International cases")}</h2>
        <CaseList cases={open.slice(0, 5)} base="/coordinator/cases" ctx={ctx} />
      </section>
    </div>
  );
}
