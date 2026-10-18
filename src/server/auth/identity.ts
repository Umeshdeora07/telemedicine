import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { oauthAccounts, sessions, users } from "@/db/schema";
import { env } from "@/config/env";
import { currencyForCountry, isCurrency } from "@/config/currencies";
import { DIAL_CODES } from "@/config/dial-codes";
import { isLocale } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { decryptText, encryptText } from "@/lib/crypto";
import { PREF_COOKIES } from "@/lib/prefs";
import { isValidTimeZone } from "@/lib/time";
import { audit } from "@/server/audit";
import { homeFor, isStaff, needsTwoStep } from "./roles";

export type ContactKind = "phone" | "email";
export type User = typeof users.$inferSelect;

/** The account that uses this email address or phone number, if any. */
export async function findUserByContact(db: DB, kind: ContactKind, value: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(kind === "phone" ? eq(users.phone, value) : sql`lower(${users.email}) = ${value.toLowerCase()}`);
  return user ?? null;
}

/** A new patient account. `proven`: the login itself showed the person owns this email or number. */
export async function createUser(db: DB, kind: ContactKind, value: string, proven: boolean, passwordHash?: string) {
  const dial = kind === "phone" ? DIAL_CODES.find((d) => value.startsWith(d.code)) : undefined;
  const country = dial?.country ?? "IN";
  const jar = await cookies();
  const tz = jar.get(PREF_COOKIES.tz)?.value;
  const cur = jar.get(PREF_COOKIES.currency)?.value;
  const now = new Date();
  const [user] = await db
    .insert(users)
    .values({
      role: "patient",
      phone: kind === "phone" ? value : null,
      email: kind === "email" ? value : null,
      phoneVerifiedAt: kind === "phone" && proven ? now : null,
      emailVerifiedAt: kind === "email" && proven ? now : null,
      passwordHash: passwordHash ?? null,
      countryCode: country,
      language: await getLocale(),
      currency: isCurrency(cur) ? cur : currencyForCountry(country),
      timeZone: tz && isValidTimeZone(tz) ? tz : "Asia/Kolkata",
    })
    .returning();
  return user!;
}

/**
 * A code sent to this email or number, or Google or Apple, has just proved the
 * person owns it. Returns the account to log in to:
 * - an account that already proved it: that account;
 * - a patient account that was made with a password and this very address or
 *   number (it was typed at sign up, never proved): that account, so someone
 *   who forgot their password gets back in. Its password and two step setup
 *   are removed and every session on it ends, so whoever signed up with
 *   someone else's address or number loses the account to its real owner;
 * - "taken" in every other case where an account has it unproven (typed in at
 *   onboarding, a staff account, an account that logs in with Google or Apple,
 *   or one that proved another contact), so an account full of someone's
 *   records is never handed to another person;
 * - null when no account uses it yet.
 */
export async function accountForProvenContact(db: DB, kind: ContactKind, value: string): Promise<User | "taken" | null> {
  const user = await findUserByContact(db, kind, value);
  if (!user) return null;
  if (kind === "phone" ? user.phoneVerifiedAt : user.emailVerifiedAt) return user;
  // Password sign up stores one contact; onboarding may add an email later. So
  // the address or number the account was made with is its phone if it has one.
  const signedUpWith: ContactKind = user.phone ? "phone" : "email";
  const [oauth] = await db.select({ provider: oauthAccounts.provider }).from(oauthAccounts).where(eq(oauthAccounts.userId, user.id)).limit(1);
  const madeWithThis = kind === signedUpWith && !user.emailVerifiedAt && !user.phoneVerifiedAt && !oauth;
  if (!madeWithThis || isStaff(user.role)) return "taken";
  const now = new Date();
  const [updated] = await db
    .update(users)
    .set({
      ...(kind === "phone" ? { phoneVerifiedAt: now } : { emailVerifiedAt: now }),
      passwordHash: null,
      failedLogins: 0,
      lockedUntil: null,
      mfaSecretEnc: null,
      mfaEnabledAt: null,
      authVersion: sql`${users.authVersion} + 1`,
    })
    .where(eq(users.id, user.id))
    .returning();
  await db.delete(sessions).where(eq(sessions.userId, user.id));
  if (user.passwordHash) {
    await audit({ actor: { id: user.id, role: user.role }, action: "auth.contact_proven_password_removed", entityType: "user", entityId: user.id, metadata: { kind } });
  }
  return updated!;
}

/* After a code or Google/Apple login the person may set a new password without the old one, for a short while. */
const RESET_COOKIE = "pw_reset";
const RESET_MINUTES = 15;

export async function grantPasswordReset(userId: string) {
  (await cookies()).set(RESET_COOKIE, encryptText(JSON.stringify({ u: userId, exp: Date.now() + RESET_MINUTES * 60_000 })), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.secureCookies,
    path: "/",
    maxAge: RESET_MINUTES * 60,
  });
}

export async function hasPasswordReset(userId: string) {
  const raw = (await cookies()).get(RESET_COOKIE)?.value;
  if (!raw) return false;
  try {
    const v = JSON.parse(decryptText(raw)) as { u?: string; exp?: number };
    return v.u === userId && typeof v.exp === "number" && v.exp > Date.now();
  } catch {
    return false;
  }
}

export async function clearPasswordReset() {
  (await cookies()).delete({ name: RESET_COOKIE, path: "/" });
}

/**
 * A path on this site to go to after logging in, or null. Browsers treat a
 * backslash like a slash, so "/" followed by a backslash and a host would go
 * to another site: anything but a plain path is refused.
 */
export function safeNext(next: unknown) {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(next)) return null;
  try {
    const u = new URL(next, "http://x");
    if (u.origin !== "http://x" || u.pathname.startsWith("/api/")) return null;
    return u.pathname + u.search + u.hash;
  } catch {
    return null;
  }
}

/** Where to go after logging in: two step verification for staff, onboarding for new patients, else home. */
export async function afterLogin(db: DB, userId: string, next: string | null): Promise<never> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) redirect("/login");
  if (user.status === "suspended") redirect("/login?error=suspended");
  const jar = await cookies();
  // Bring saved display preferences to this device.
  const p = user.preferences;
  const year = 60 * 60 * 24 * 365;
  if (p.theme === "light" || p.theme === "dark") jar.set(PREF_COOKIES.theme, p.theme, { path: "/", maxAge: year });
  if (isLocale(user.language)) jar.set("lang", user.language, { path: "/", maxAge: year });
  if (needsTwoStep(user.role)) redirect(`/mfa${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  // Someone joining as a doctor goes straight on: the patient questions are not for them.
  if (!user.onboarded && !isStaff(user.role) && !next?.startsWith("/for-doctors/")) redirect(`/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  redirect(next ?? homeFor(user.role));
}
