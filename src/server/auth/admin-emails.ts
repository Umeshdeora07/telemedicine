import "server-only";
import { eq, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { rows } from "@/db";
import { settings, users } from "@/db/schema";
import { audit } from "@/server/audit";

/** Set once the first person to log in has become the admin. */
export const FIRST_ADMIN_CLAIMED = "setup:first_admin";

/** Addresses in ADMIN_EMAILS (comma separated) become admins when they log in. */
export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Makes the site owner an admin the first time they log in. Pass only an email
 * the login itself proved (a one time code sent to it, or Google or Apple
 * confirming it), never an address typed into a profile.
 */
export async function promoteIfAdminEmail(db: DB, user: { id: string; role: string }, verifiedEmail: string | null | undefined) {
  if (!verifiedEmail || user.role === "super_admin" || !adminEmails().includes(verifiedEmail.toLowerCase())) return user.role;
  await db.update(users).set({ role: "super_admin", onboarded: true }).where(eq(users.id, user.id));
  await audit({ actor: { id: user.id, role: "super_admin" }, action: "auth.admin_from_email", entityType: "user", entityId: user.id });
  return "super_admin";
}

/**
 * Without ADMIN_EMAILS, the first person to log in to a site that has no admin
 * becomes the admin. It happens once: the claim is recorded in settings (its
 * key is the primary key, so two people logging in at the same moment cannot
 * both win), and later logins never become admins this way, even if that
 * account is removed. Only patient accounts are promoted, so a doctor's
 * profile is never lost.
 */
export async function claimFirstAdmin(db: DB, user: { id: string; role: string }) {
  if (user.role !== "patient") return user.role;
  const won = await db.transaction(async (tx) => {
    const [admin] = rows<{ found: boolean }>(await tx.execute(sql`select exists (select 1 from users where role = 'super_admin') as found`));
    if (admin?.found) return false;
    const claimed = await tx.insert(settings).values({ key: FIRST_ADMIN_CLAIMED, value: user.id }).onConflictDoNothing().returning({ key: settings.key });
    if (!claimed.length) return false;
    await tx.update(users).set({ role: "super_admin", onboarded: true }).where(eq(users.id, user.id));
    return true;
  });
  if (!won) return user.role;
  await audit({ actor: { id: user.id, role: "super_admin" }, action: "auth.admin_first_login", entityType: "user", entityId: user.id });
  return "super_admin";
}

/** After a successful login: ADMIN_EMAILS when it is set, otherwise the first login rule. */
export async function grantAdminOnLogin(db: DB, user: { id: string; role: string }, verifiedEmail: string | null | undefined) {
  if (adminEmails().length) return promoteIfAdminEmail(db, user, verifiedEmail);
  return claimFirstAdmin(db, user);
}
