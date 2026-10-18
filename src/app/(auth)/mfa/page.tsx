import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/server/auth/session";
import { homeFor, needsTwoStep } from "@/server/auth/roles";
import { safeNext } from "@/server/auth/identity";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = { title: "Two step verification" };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next) ?? undefined;
  const session = await requireSession({ allowWithoutMfa: true });
  if (!needsTwoStep(session.user.role) || session.mfaVerified) redirect(next ?? homeFor(session.user.role));
  const { t } = await getI18n();
  return (
    <Card className="mx-auto max-w-md space-y-6 p-6 sm:p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold">{t("Two step verification")}</h1>
        <p className="text-fg-muted">{t("This keeps patient records safe even if someone learns your login code.")}</p>
      </div>
      <MfaForm enrolled={Boolean(session.user.mfaEnabledAt)} account={session.user.email ?? session.user.phone ?? session.user.name} issuer={brand.name} next={next} demo={env.demoMode} />
    </Card>
  );
}
