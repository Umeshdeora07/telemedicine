import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { Card } from "@/components/ui/card";
import { requireSession } from "@/server/auth/session";
import { hasPasswordReset } from "@/server/auth/identity";
import { maskPhone } from "@/lib/utils";
import { env } from "@/config/env";
import { emailConfigured, phoneCodesConfigured } from "@/lib/providers";
import { PasswordChangeForm } from "./password-form";

export const metadata: Metadata = { title: "Password", robots: { index: false } };

/** Add or change the password for logging in with an email or mobile number. */
export default async function PasswordPage() {
  const session = await requireSession({ allowNotOnboarded: true });
  const { user } = session;
  const { t } = await getI18n();
  const hasPassword = Boolean(user.passwordHash);
  const needsCurrent = hasPassword && !(await hasPasswordReset(user.id));
  const loginWith = user.email ?? (user.phone ? maskPhone(user.phone) : null);
  return (
    <Card className="mx-auto max-w-md space-y-6 p-6 sm:p-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold">{hasPassword ? t("Change your password") : t("Add a password")}</h1>
        <p className="text-fg-muted">
          {loginWith
            ? t("You log in with {contact} and this password.", { contact: loginWith })
            : t("Your account has no email or mobile number to log in with.")}
        </p>
      </div>
      {loginWith ? <PasswordChangeForm needsCurrent={needsCurrent} hasPassword={hasPassword} canUseCode={env.demoMode || phoneCodesConfigured() || emailConfigured()} /> : null}
    </Card>
  );
}
