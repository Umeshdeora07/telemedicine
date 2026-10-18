"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { getT } from "@/i18n/server";
import { DIAL_CODES } from "@/config/dial-codes";
import { passwordLoginEnabled } from "@/lib/providers";
import { audit } from "@/server/audit";
import { grantAdminOnLogin } from "@/server/auth/admin-emails";
import { afterLogin, clearPasswordReset, hasPasswordReset, safeNext } from "@/server/auth/identity";
import { parseIdentifier } from "@/server/auth/otp";
import { checkCurrentPassword, createResetLink, logInWithPassword, redeemResetLink, setPassword, signUpWithPassword } from "@/server/auth/passwords";
import { createSession, requireSession } from "@/server/auth/session";
import { env } from "@/config/env";

/**
 * `values` refill the form after an error (React clears it after every
 * submit); `n` counts answers, so the same error twice is announced twice.
 */
export type PasswordAuthState = { error?: string; field?: "identifier" | "password"; values?: { identifier: string; dial: string }; n?: number };

/** Log in, or create an account, with an email or mobile number and a password. */
export async function passwordAuthAction(prev: PasswordAuthState, form: FormData): Promise<PasswordAuthState> {
  const res = await passwordAuth(form);
  return { ...res, n: (prev.n ?? 0) + 1 };
}

async function passwordAuth(form: FormData): Promise<PasswordAuthState> {
  const t = await getT();
  if (!passwordLoginEnabled()) return { error: t("Logging in with a password is turned off on this site.") };
  const signup = form.get("intent") === "signup";
  const dial = String(form.get("dial") ?? "+91");
  const raw = String(form.get("identifier") ?? "");
  const values = { identifier: raw.slice(0, 200), dial };
  const id = parseIdentifier(raw, DIAL_CODES.some((d) => d.code === dial) ? dial : "+91");
  if (!id) {
    return { values, field: "identifier", error: raw.includes("@") ? t("Please enter a valid email address.") : t("Please enter a valid mobile number, for example 98100 00001.") };
  }
  const password = String(form.get("password") ?? "");
  if (!password) return { values, field: "password", error: t("Please enter your password.") };
  const db = await getDb();
  const res = signup ? await signUpWithPassword(db, id.kind, id.value, password) : await logInWithPassword(db, id.kind, id.value, password);
  if (!res.ok) return { values, field: res.field, error: t(res.error, res.params) };
  const user = res.value;
  // A typed address proves nothing, so ADMIN_EMAILS never applies here; the first login rule does.
  user.role = (await grantAdminOnLogin(db, user, null)) as typeof user.role;
  // The authVersion read with the password: if it changed meanwhile, this session never works.
  await createSession(user.id, { authVersion: user.authVersion });
  await audit({ actor: { id: user.id, role: user.role }, action: signup ? "auth.signup" : "auth.login", entityType: "user", entityId: user.id, metadata: { method: `password_${id.kind}` } });
  return afterLogin(db, user.id, safeNext(form.get("next")));
}

/** `needsCurrent`: the time to change it without the old password ran out, so ask for it. */
export type ChangePasswordState = { ok?: boolean; error?: string; field?: "current" | "password"; needsCurrent?: boolean };

/** Add or change the password of the account that is logged in. */
export async function changePasswordAction(_prev: ChangePasswordState, form: FormData): Promise<ChangePasswordState> {
  const t = await getT();
  const session = await requireSession({ allowNotOnboarded: true });
  const { user } = session;
  if (!user.email && !user.phone) return { error: t("Your account has no email or mobile number to log in with.") };
  const current = String(form.get("current") ?? "");
  const needsCurrent = Boolean(user.passwordHash) && !(await hasPasswordReset(user.id));
  if (needsCurrent && !form.has("current")) {
    return {
      field: "current",
      needsCurrent: true,
      error: t("The time to choose a new password without your old one has run out. Enter your current password, or log in again with a one time code."),
    };
  }
  if (needsCurrent && !(await checkCurrentPassword(user, current))) {
    await audit({ actor: { id: user.id, role: user.role }, action: "auth.password_change_failed", entityType: "user", entityId: user.id });
    return { field: "current", needsCurrent: true, error: t("Your current password is not right.") };
  }
  const res = await setPassword(await getDb(), user, String(form.get("password") ?? ""), session.id);
  if (!res.ok) return { field: "password", error: t(res.error, res.params) };
  await clearPasswordReset();
  return { ok: true };
}

export type ResetLinkState = { error?: string; url?: string };

/** Admin: a one time link for someone to choose a new password. */
export async function createResetLinkAction(userId: string): Promise<ResetLinkState> {
  const t = await getT();
  const admin = await requireSession({ roles: ["super_admin"] });
  const res = await createResetLink(await getDb(), { id: admin.user.id, role: admin.user.role }, userId);
  if (!res.ok) return { error: t(res.error) };
  return { url: `${env.appUrl}/password/reset/${res.value}` };
}

export type ResetState = { error?: string; field?: "password" };

/** Choose a new password with a reset link, then log in with it. */
export async function resetPasswordAction(_prev: ResetState, form: FormData): Promise<ResetState> {
  const t = await getT();
  const db = await getDb();
  const res = await redeemResetLink(db, String(form.get("token") ?? ""), String(form.get("password") ?? ""));
  if (!res.ok) return { field: res.field === "password" ? "password" : undefined, error: t(res.error, res.params) };
  // Logged in straight away (staff still pass two step verification next).
  if (res.value.status !== "active") redirect("/login?error=suspended");
  await createSession(res.value.id);
  await audit({ actor: { id: res.value.id, role: res.value.role }, action: "auth.login", entityType: "user", entityId: res.value.id, metadata: { method: "reset_link" } });
  return afterLogin(db, res.value.id, null);
}
