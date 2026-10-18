import type { Metadata } from "next";
import { UserPlus, Users } from "lucide-react";
import { getViewContext } from "@/server/context";
import { familyOverview } from "@/server/patient-app";
import { revokeFamilyAction, resendFamilyCodeAction } from "@/server/actions/patient-app";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { InitialsAvatar } from "@/components/ui/avatar";
import { PermissionToggles } from "@/components/patient/family-tools";
import { ActionButton } from "@/components/patient/records-tools";
import { ageFrom, maskPhone } from "@/lib/utils";

export const metadata: Metadata = { title: "Family members" };

export default async function FamilyPage({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t, fmt, user } = ctx;
  const f = await familyOverview(user!);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t("Family members")} description={t("Book and join consultations for your parents, children or partner, even from abroad. Adults agree with a code sent to their phone.")} actions={<ButtonLink href="/family/new"><UserPlus className="size-5" aria-hidden />{t("Add family member")}</ButtonLink>} />
      {sp.added ? <Alert tone="success">{t("Done. You can now book for them.")}</Alert> : null}
      {f.mine.length ? (
        <ul className="space-y-3">
          {f.mine.map(({ l, p }) => {
            const age = ageFrom(p.dob);
            return (
              <li key={l.id} className="card space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <InitialsAvatar name={p.fullName} size={44} />
                  <div>
                    <p className="font-bold">{p.fullName}</p>
                    <p className="text-sm text-fg-muted">{t(l.relationship)}{age !== null ? ` · ${t("{n} years", { n: age })}` : ""} · {p.country}{p.phone ? ` · ${maskPhone(p.phone)}` : ""}</p>
                  </div>
                  <span className="ms-auto">
                    {l.status === "active" ? <Badge tone="success">{l.consentMethod === "guardian_declaration" ? t("Guardian") : t("Consent given {date}", { date: l.consentAt ? fmt.date(l.consentAt) : "" })}</Badge> : <Badge tone="warning">{t("Waiting for their consent")}</Badge>}
                  </span>
                </div>
                {l.status === "active" ? <PermissionToggles linkId={l.id} perms={{ canBook: l.canBook, canJoin: l.canJoin, canViewRecords: l.canViewRecords, receivesNotifications: l.receivesNotifications }} mine /> : (
                  <div className="flex flex-wrap gap-2">
                    <ButtonLink href={`/family/new?link=${l.id}`} size="sm">{t("Enter their code")}</ButtonLink>
                    <ActionButton action={resendFamilyCodeAction.bind(null, l.id)} label={t("Send code again")} />
                  </div>
                )}
                <ActionButton action={revokeFamilyAction.bind(null, l.id)} label={t("Remove")} confirmText={t("Remove {name}? You will no longer see their consultations.", { name: p.fullName })} />
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<Users className="size-8" aria-hidden />} title={t("No family members yet")} action={<ButtonLink href="/family/new">{t("Add family member")}</ButtonLink>}>
          {t("Add your parents to book doctors for them from anywhere in the world.")}
        </EmptyState>
      )}
      {f.caregivers.length ? (
        <section className="space-y-3" aria-labelledby="mine">
          <h2 id="mine" className="text-lg font-bold">{t("People who can help with my care")}</h2>
          {f.caregivers.map(({ l, name, phone }) => (
            <div key={l.id} className="card space-y-2 p-4">
              <p className="font-semibold">{name} <span className="text-sm font-normal text-fg-muted">· {t(l.relationship)} · {maskPhone(phone)}</span></p>
              <PermissionToggles linkId={l.id} perms={{ canBook: l.canBook, canJoin: l.canJoin, canViewRecords: l.canViewRecords, receivesNotifications: l.receivesNotifications }} mine={false} />
              <ActionButton action={revokeFamilyAction.bind(null, l.id)} label={t("Remove their access")} confirmText={t("Remove {name}'s access?", { name })} variant="danger" />
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
