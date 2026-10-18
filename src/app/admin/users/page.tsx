import type { Metadata } from "next";
import { getViewContext } from "@/server/context";
import { searchUsers } from "@/server/admin";
import { ROLE_LABELS, type Role } from "@/server/auth/roles";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ResetLinkButton, UserStatusButton } from "@/components/admin/admin-forms";
import { maskPhone, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const rows = await searchUsers(q);
  return (
    <div className="space-y-6">
      <PageHeader title={t("Users")} description={t("Search by name, phone or email. Suspending signs the person out everywhere. Someone who forgot their password can get a reset link from you.")} />
      <form role="search" className="flex max-w-lg gap-2">
        <label htmlFor="uq" className="sr-only">{t("Search users")}</label>
        <Input id="uq" name="q" defaultValue={q} placeholder={t("Name, phone or email")} />
        <Button type="submit" variant="secondary">{t("Search")}</Button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-[0.9375rem]">
          <caption className="sr-only">{t("Users")}</caption>
          <thead className="border-b border-line text-sm text-fg-muted"><tr><th scope="col" className="p-3">{t("Name")}</th><th scope="col" className="p-3">{t("Role")}</th><th scope="col" className="p-3">{t("Contact")}</th><th scope="col" className="p-3">{t("Country")}</th><th scope="col" className="p-3">{t("Last login")}</th><th scope="col" className="p-3 text-end">{t("Status")}</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="p-3 font-semibold">{u.name || t("No name")}{u.mfaEnabledAt ? <Badge tone="success" className="ms-2">2FA</Badge> : null}</td>
                <td className="p-3">{t(ROLE_LABELS[u.role as Role] ?? u.role)}</td>
                <td className="p-3">{u.email ?? maskPhone(u.phone)}</td>
                <td className="p-3">{u.countryCode}</td>
                <td className="p-3">{u.lastLoginAt ? fmt.date(u.lastLoginAt) : t("Never")}</td>
                <td className="p-3 text-end"><span className="inline-flex flex-wrap items-center justify-end gap-2">{u.status !== "active" ? <Badge tone="danger">{t(humanize(u.status))}</Badge> : null}{u.role !== "super_admin" && (u.email || u.phone) ? <ResetLinkButton id={u.id} /> : null}<UserStatusButton id={u.id} status={u.status} /></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
