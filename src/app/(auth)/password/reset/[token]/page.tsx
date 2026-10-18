import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db";
import { getI18n } from "@/i18n/server";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { findResetLink } from "@/server/auth/passwords";
import { maskPhone } from "@/lib/utils";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

/** Opened from a one time link an admin sent; lets the person choose a new password. */
export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t } = await getI18n();
  const row = await findResetLink(await getDb(), token);
  return (
    <Card className="mx-auto max-w-md space-y-6 p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold">{t("Choose a new password")}</h1>
      {row ? (
        <>
          <p className="text-fg-muted">{t("For the account {contact}. After this you log in with the new password.", { contact: row.user.email ?? maskPhone(row.user.phone) })}</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <Alert tone="warning" title={t("This link has expired or was already used. Please ask us for a new one.")}>
          <Link href="/login" className="font-semibold underline">
            {t("Go to log in")}
          </Link>
        </Alert>
      )}
    </Card>
  );
}
