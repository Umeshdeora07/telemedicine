import "server-only";
import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import { users } from "@/db/schema";
import { audit } from "@/server/audit";

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
