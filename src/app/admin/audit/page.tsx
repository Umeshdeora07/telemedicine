import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { searchAudit } from "@/server/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Audit log" };

const ACTIONS = ["record.view", "prescription", "doctor.", "licence.", "payment.", "appointment.", "case.", "user.", "settings.", "auth."];

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; a?: string }> }) {
  const { q = "", a = "" } = await searchParams;
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const rows = await searchAudit({ q: q || undefined, action: a || undefined });
  return (
    <div className="space-y-6">
      <PageHeader title={t("Audit log")} description={t("A permanent record of who viewed or changed what. Every view of health records is logged with the patient, so you can answer “who saw my records?” requests.")} />
      <form role="search" className="flex flex-wrap gap-2">
        <label htmlFor="aq" className="sr-only">{t("Person or record id")}</label>
        <Input id="aq" name="q" defaultValue={q} placeholder={t("Person or record id")} className="max-w-xs" />
        <label htmlFor="aa" className="sr-only">{t("Action")}</label>
        <Select id="aa" name="a" defaultValue={a} className="w-auto"><option value="">{t("All actions")}</option>{ACTIONS.map((x) => <option key={x} value={x}>{x}</option>)}</Select>
        <Button type="submit" variant="secondary">{t("Filter")}</Button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <caption className="sr-only">{t("Audit log")}</caption>
          <thead className="border-b border-line text-fg-muted"><tr><th scope="col" className="p-2">{t("When")}</th><th scope="col" className="p-2">{t("Who")}</th><th scope="col" className="p-2">{t("Action")}</th><th scope="col" className="p-2">{t("Record")}</th><th scope="col" className="p-2">{t("Details")}</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ l, name }) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap p-2">{fmt.dateTime(l.createdAt)}</td>
                <td className="p-2">{name ?? t("system")}<span className="block text-xs text-fg-muted">{l.actorRole}</span></td>
                <td className="p-2 font-mono">{l.action}</td>
                <td className="p-2">{l.entityType}<span className="block font-mono text-xs text-fg-muted">{l.entityId?.slice(0, 12)}</span></td>
                <td className="max-w-80 truncate p-2 font-mono text-xs text-fg-muted">{Object.keys(l.metadata).length ? JSON.stringify(l.metadata) : ""}{l.ip ? ` ${l.ip}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
