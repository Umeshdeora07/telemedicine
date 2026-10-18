import "server-only";
import { and, eq, gt, isNull, lte, ne, or, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { otpCodes, sessions, users } from "@/db/schema";
import { keyedHash, randomToken } from "@/lib/crypto";
import { audit } from "@/server/audit";
import { hashPassword, MIN_PASSWORD, passwordProblem, verifyPassword } from "./password";
import { createUser, findUserByContact, type ContactKind, type User } from "./identity";

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
export const RESET_LINK_HOURS = 24;

export type PasswordResult<T> = { ok: true; value: T } | { ok: false; error: string; params?: Record<string, string | number>; field?: "identifier" | "password" };

const problem = (error: string, field?: "identifier" | "password", params?: Record<string, string | number>) => ({ ok: false as const, error, field, params });

/** A new account with a password. The email or number is not proven, so it never makes anyone an admin by ADMIN_EMAILS. */
export async function signUpWithPassword(db: DB, kind: ContactKind, value: string, password: string): Promise<PasswordResult<User>> {
  const bad = passwordProblem(password, value);
  if (bad) return problem(bad, "password", { n: MIN_PASSWORD });
  const taken = "An account with this email or number already exists. Please log in instead.";
  if (await findUserByContact(db, kind, value)) return problem(taken, "identifier");
  const hash = await hashPassword(password);
  try {
    return { ok: true, value: await createUser(db, kind, value, false, hash) };
  } catch (e) {
    // Two sign ups with the same address at the same moment: the unique index decides.
    if ((e as { code?: string; cause?: { code?: string } }).code === "23505" || (e as { cause?: { code?: string } }).cause?.code === "23505") {
      return problem(taken, "identifier");
    }
    throw e;
  }
}

/**
 * Checks a password. Each try is counted before the slow check, in one
 * update, so parallel guesses can't get past the limit: the account locks for
 * LOCK_MINUTES after MAX_FAILED_LOGINS tries, and a right password resets the
 * count. The password checked and the returned authVersion come from that same
 * update, so a session made from this login stops working if the password
 * changes or the account changes hands at the same moment. Unknown accounts,
 * and accounts without a password, give the same answer as a wrong password.
 */
export async function logInWithPassword(db: DB, kind: ContactKind, value: string, password: string): Promise<PasswordResult<User>> {
  const wrong = problem("That email or number and password don't match. Please try again.", "password");
  const user = await findUserByContact(db, kind, value);
  if (!user?.passwordHash) {
    await verifyPassword(password, null);
    return wrong;
  }
  const lockNow = sql`${users.failedLogins} + 1 >= ${MAX_FAILED_LOGINS}`;
  const [slot] = await db
    .update(users)
    .set({
      failedLogins: sql`case when ${lockNow} then 0 else ${users.failedLogins} + 1 end`,
      lockedUntil: sql`case when ${lockNow} then now() + make_interval(mins => ${LOCK_MINUTES}) else null end`,
    })
    .where(and(eq(users.id, user.id), or(isNull(users.lockedUntil), lte(users.lockedUntil, sql`now()`))))
    .returning({ passwordHash: users.passwordHash, authVersion: users.authVersion, lockedUntil: users.lockedUntil });
  if (!slot) {
    const [now] = await db.select({ lockedUntil: users.lockedUntil }).from(users).where(eq(users.id, user.id));
    const left = now?.lockedUntil ? Math.max(1, Math.ceil((now.lockedUntil.getTime() - Date.now()) / 60_000)) : LOCK_MINUTES;
    return problem("Too many wrong passwords. Please wait {n} minutes and try again.", "password", { n: left });
  }
  if (!(await verifyPassword(password, slot.passwordHash))) {
    await audit({ actor: { id: user.id, role: user.role }, action: slot.lockedUntil ? "auth.password_locked" : "auth.password_failed", entityType: "user", entityId: user.id });
    return wrong;
  }
  if (user.status !== "active") return problem("This account is suspended. Please contact support.");
  await db.update(users).set({ failedLogins: 0, lockedUntil: null }).where(eq(users.id, user.id));
  return { ok: true, value: { ...user, passwordHash: slot.passwordHash, authVersion: slot.authVersion, failedLogins: 0, lockedUntil: null } };
}

/**
 * Sets a new password. Every other session ends (also one being made at this
 * moment, through authVersion), so a device someone else may have is logged
 * out; `keepSessionId` stays logged in.
 */
export async function setPassword(db: DB, user: { id: string; role: string; email: string | null; phone: string | null }, password: string, keepSessionId?: string): Promise<PasswordResult<null>> {
  const bad = passwordProblem(password, user.email ?? user.phone ?? undefined);
  if (bad) return problem(bad, "password", { n: MIN_PASSWORD });
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    const [u] = await tx
      .update(users)
      .set({ passwordHash: hash, failedLogins: 0, lockedUntil: null, authVersion: sql`${users.authVersion} + 1` })
      .where(eq(users.id, user.id))
      .returning({ authVersion: users.authVersion });
    if (keepSessionId) {
      await tx.update(sessions).set({ authVersion: u!.authVersion }).where(and(eq(sessions.id, keepSessionId), eq(sessions.userId, user.id)));
      await tx.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.id, keepSessionId)));
    } else {
      await tx.delete(sessions).where(eq(sessions.userId, user.id));
    }
  });
  await audit({ actor: { id: user.id, role: user.role }, action: "auth.password_set", entityType: "user", entityId: user.id });
  return { ok: true, value: null };
}

export async function checkCurrentPassword(user: { passwordHash: string | null }, password: string) {
  return verifyPassword(password, user.passwordHash);
}

/* ------------------------------------------- reset links made by an admin */

const resetHash = (token: string) => keyedHash(`password_reset:${token}`);
const resetIdentifier = (userId: string) => `user:${userId}`;

/**
 * A link that lets the person choose a new password, for sites without an
 * email or SMS service. The admin sends it to them (for example by WhatsApp).
 * It works once, for RESET_LINK_HOURS, and replaces any earlier link.
 */
export async function createResetLink(db: DB, admin: { id: string; role: string }, userId: string): Promise<PasswordResult<string>> {
  const [target] = await db.select().from(users).where(eq(users.id, userId));
  if (!target) return problem("Not found.");
  if (target.role === "super_admin" || target.id === admin.id) return problem("Admins change their own password under Password.");
  if (!target.email && !target.phone) return problem("This account has no email or mobile number to log in with.");
  const token = randomToken(24);
  await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(otpCodes.identifier, resetIdentifier(userId)), eq(otpCodes.purpose, "password_reset"), isNull(otpCodes.consumedAt)));
  await db.insert(otpCodes).values({
    identifier: resetIdentifier(userId),
    purpose: "password_reset",
    codeHash: resetHash(token),
    expiresAt: new Date(Date.now() + RESET_LINK_HOURS * 3600_000),
  });
  await audit({ actor: admin, action: "auth.password_reset_link", entityType: "user", entityId: userId });
  return { ok: true, value: token };
}

const resetUserId = sql`'user:' || ${users.id}::text`;

/** The account a reset link is for, while the link is still valid. */
export async function findResetLink(db: DB, token: string) {
  if (!/^[\w-]{20,80}$/.test(token)) return null;
  const [row] = await db
    .select({ code: otpCodes, user: users })
    .from(otpCodes)
    .innerJoin(users, eq(otpCodes.identifier, resetUserId))
    .where(and(eq(otpCodes.codeHash, resetHash(token)), eq(otpCodes.purpose, "password_reset"), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, new Date())));
  return row ?? null;
}

export async function redeemResetLink(db: DB, token: string, password: string): Promise<PasswordResult<User>> {
  const expired = "This link has expired or was already used. Please ask us for a new one.";
  const row = await findResetLink(db, token);
  if (!row) return problem(expired);
  const bad = passwordProblem(password, row.user.email ?? row.user.phone ?? undefined);
  if (bad) return problem(bad, "password", { n: MIN_PASSWORD });
  // Use the link up first, so it can't work twice.
  const used = await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(otpCodes.id, row.code.id), isNull(otpCodes.consumedAt)))
    .returning({ id: otpCodes.id });
  if (!used.length) return problem(expired);
  const set = await setPassword(db, row.user, password);
  if (!set.ok) return set;
  return { ok: true, value: row.user };
}
