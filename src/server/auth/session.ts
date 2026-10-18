import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { env } from "@/config/env";
import { randomToken, sha256 } from "@/lib/crypto";
import { homeFor, isStaff, needsTwoStep, type Role } from "./roles";

export const SESSION_COOKIE = "cm_session";
const ABSOLUTE_DAYS = 30;

export type SessionUser = typeof users.$inferSelect;
export type Session = { id: string; user: SessionUser; mfaVerified: boolean; idleMinutes: number };

export function idleMinutesFor(role: string) {
  return isStaff(role) ? env.sessionIdleMinutesStaff : env.sessionIdleMinutesPatient;
}

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || null;
}

/**
 * `authVersion`: the account's users.authVersion as read before checking a
 * password. If the password changed or the account changed hands meanwhile,
 * the new session is born stale and never works. Without it, the current
 * value is used.
 */
export async function createSession(userId: string, opts: { mfaVerified?: boolean; authVersion?: number } = {}) {
  const db = await getDb();
  const token = randomToken(32);
  const h = await headers();
  const expiresAt = new Date(Date.now() + ABSOLUTE_DAYS * 86400_000);
  await db.insert(sessions).values({
    id: sha256(token),
    userId,
    mfaVerified: opts.mfaVerified ?? false,
    authVersion: opts.authVersion ?? sql`(select ${users.authVersion} from ${users} where ${users.id} = ${userId})`,
    expiresAt,
    ip: await clientIp(),
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
  });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.secureCookies,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  // Clean up long-expired sessions for this user.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
}

/** Current session, enforcing absolute expiry and the idle timeout. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const id = sha256(token);
  const [row] = await db.select({ s: sessions, u: users }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(eq(sessions.id, id));
  if (!row) return null;
  const now = Date.now();
  const idle = idleMinutesFor(row.u.role);
  const expired = row.s.expiresAt.getTime() < now || row.s.lastSeenAt.getTime() + idle * 60_000 < now;
  // A session from before a password change or a change of owner no longer counts.
  const stale = row.s.authVersion !== row.u.authVersion;
  if (expired || stale || row.u.status === "suspended" || row.u.status === "deleted") {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (now - row.s.lastSeenAt.getTime() > 60_000) {
    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, id));
  }
  return { id, user: row.u, mfaVerified: row.s.mfaVerified, idleMinutes: idle };
});

export async function getUser() {
  return (await getSession())?.user ?? null;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export async function markMfaVerified(sessionId: string) {
  const db = await getDb();
  await db.update(sessions).set({ mfaVerified: true, lastSeenAt: new Date() }).where(eq(sessions.id, sessionId));
}

async function currentPath() {
  const h = await headers();
  return h.get("x-pathname") || "/";
}

/**
 * Require a signed-in user (optionally with one of `roles`). Staff must have
 * passed two-factor verification. Redirects instead of throwing.
 */
export async function requireSession(opts: { roles?: Role[]; allowWithoutMfa?: boolean; allowNotOnboarded?: boolean } = {}) {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(await currentPath())}`);
  const { user } = session;
  if (needsTwoStep(user.role) && !session.mfaVerified && !opts.allowWithoutMfa) redirect(`/mfa?next=${encodeURIComponent(await currentPath())}`);
  if (!user.onboarded && !opts.allowNotOnboarded && !isStaff(user.role)) redirect("/onboarding");
  if (opts.roles && !opts.roles.includes(user.role as Role)) redirect(homeFor(user.role));
  return session;
}

export async function requireUser(opts: Parameters<typeof requireSession>[0] = {}) {
  return (await requireSession(opts)).user;
}
