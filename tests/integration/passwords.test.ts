import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Password sign up and log in on a live site (no demo mode, no email, SMS
 * or Google service): accounts, lockout, proving an address later, reset
 * links and the first admin.
 */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-passwords-"));
process.env.PGLITE_DIR = path.join(dir, "pglite");
process.env.DEMO_MODE = "0";
delete process.env.ADMIN_EMAILS;

// createUser and getLocale read cookies() and headers(), which only exist inside
// a request. Give them an empty request instead.
vi.mock("next/headers", () => {
  const store = new Map<string, string>();
  const jar = {
    get: (name: string) => (store.has(name) ? { name, value: store.get(name)! } : undefined),
    getAll: () => [...store].map(([name, value]) => ({ name, value })),
    has: (name: string) => store.has(name),
    set: (name: string | { name: string; value: string }, value?: string) => {
      if (typeof name === "string") store.set(name, value ?? "");
      else store.set(name.name, name.value);
    },
    delete: (name: string | { name: string }) => store.delete(typeof name === "string" ? name : name.name),
  };
  return { cookies: async () => jar, headers: async () => new Headers() };
});

type Db = typeof import("@/db");
let dbm: Db;

beforeAll(async () => {
  dbm = await import("@/db");
  await dbm.getDb();
});

afterAll(async () => {
  await dbm?.closeDb();
  fs.rmSync(dir, { recursive: true, force: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

let n = 0;
/** A unique address or number for each account in this file. */
const email = (tag: string) => `${tag}.${Date.now().toString(36)}${++n}@example.com`;
const phone = () => `+9197${String(Date.now() % 1e6).padStart(6, "0")}${String(++n % 100).padStart(2, "0")}`;

const GOOD = "lantern-orchid-41";
const NO_MATCH = "That email or number and password don't match. Please try again.";

async function lib() {
  const db = await dbm.getDb();
  const schema = await import("@/db/schema");
  const orm = await import("drizzle-orm");
  const password = await import("@/server/auth/password");
  const passwords = await import("@/server/auth/passwords");
  const identity = await import("@/server/auth/identity");
  const admin = await import("@/server/auth/admin-emails");
  return { db, ...schema, ...orm, ...password, ...passwords, ...identity, ...admin };
}

async function stored(id: string) {
  const { db, users, eq } = await lib();
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row!;
}

async function addSession(userId: string) {
  const { db, sessions } = await lib();
  const id = randomBytes(32).toString("hex");
  await db.insert(sessions).values({ id, userId, expiresAt: new Date(Date.now() + 86_400_000) });
  return id;
}

async function sessionIds(userId: string) {
  const { db, sessions, eq } = await lib();
  return (await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId))).map((s) => s.id).sort();
}

/* The first admin claim happens once per database, so these run first. */
describe("the first person to sign up with a password", () => {
  it("becomes the admin when ADMIN_EMAILS is not set, and only once", async () => {
    const { db, signUpWithPassword, grantAdminOnLogin } = await lib();
    const first = await signUpWithPassword(db, "email", email("owner"), GOOD);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(await grantAdminOnLogin(db, first.value, null)).toBe("super_admin");
    const row = await stored(first.value.id);
    expect(row.role).toBe("super_admin");
    expect(row.onboarded).toBe(true);

    const second = await signUpWithPassword(db, "phone", phone(), GOOD);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(await grantAdminOnLogin(db, second.value, null)).toBe("patient");
    expect((await stored(second.value.id)).role).toBe("patient");
  });

  it("does not become the admin by ADMIN_EMAILS, since a typed address proves nothing", async () => {
    const owner = email("named-owner");
    vi.stubEnv("ADMIN_EMAILS", owner);
    const { db, signUpWithPassword, grantAdminOnLogin } = await lib();
    const res = await signUpWithPassword(db, "email", owner, GOOD);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // passwordAuthAction passes null: the email was only typed in.
    expect(await grantAdminOnLogin(db, res.value, null)).toBe("patient");
    expect((await stored(res.value.id)).role).toBe("patient");
  });
});

describe("password hashing", () => {
  it("verifies the right password and refuses a wrong one", async () => {
    const { hashPassword, verifyPassword } = await lib();
    const hash = await hashPassword(GOOD);
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(hash).not.toContain(GOOD);
    expect(await verifyPassword(GOOD, hash)).toBe(true);
    expect(await verifyPassword("lantern-orchid-42", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
    // Salted: the same password gives a different hash each time.
    expect(await hashPassword(GOOD)).not.toBe(hash);
  });

  it("refuses when there is no stored password or it is not a hash", async () => {
    const { verifyPassword } = await lib();
    expect(await verifyPassword(GOOD, null)).toBe(false);
    expect(await verifyPassword(GOOD, undefined)).toBe(false);
    expect(await verifyPassword(GOOD, "plain-text")).toBe(false);
  });
});

describe("passwordProblem", () => {
  it("asks for at least 8 characters", async () => {
    const { passwordProblem } = await lib();
    expect(passwordProblem("short")).toBe("Please use at least {n} characters.");
    expect(passwordProblem("1234567")).toBe("Please use at least {n} characters.");
    expect(passwordProblem("x".repeat(201))).toBe("That password is too long.");
  });

  it("refuses passwords that are easy to guess", async () => {
    const { passwordProblem } = await lib();
    for (const p of ["password", "Password123", "12345678", "1234567890", "qwerty123", "aaaaaaaa", "11111111", "iloveyou"]) {
      expect(passwordProblem(p), p).toBe("That password is too easy to guess. Please choose another.");
    }
  });

  it("refuses the email or number itself", async () => {
    const { passwordProblem } = await lib();
    expect(passwordProblem("meena.k@example.com", "Meena.K@Example.com")).toBe("Please don't use your email or number as the password.");
    expect(passwordProblem("919812345678", "+919812345678")).toBe("Please don't use your email or number as the password.");
  });

  it("accepts a reasonable password", async () => {
    const { passwordProblem } = await lib();
    expect(passwordProblem(GOOD)).toBeNull();
    expect(passwordProblem(GOOD, "someone@example.com")).toBeNull();
  });
});

describe("signUpWithPassword", () => {
  it("creates a patient whose email is not marked as proven", async () => {
    const { db, signUpWithPassword, verifyPassword } = await lib();
    const address = email("new");
    const res = await signUpWithPassword(db, "email", address, GOOD);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const row = await stored(res.value.id);
    expect(row.role).toBe("patient");
    expect(row.email).toBe(address);
    expect(row.phone).toBeNull();
    expect(row.emailVerifiedAt).toBeNull();
    expect(row.phoneVerifiedAt).toBeNull();
    expect(row.onboarded).toBe(false);
    expect(row.failedLogins).toBe(0);
    expect(row.passwordHash).toMatch(/^scrypt\$/);
    expect(await verifyPassword(GOOD, row.passwordHash)).toBe(true);
  });

  it("creates a patient with a mobile number that is not marked as proven", async () => {
    const { db, signUpWithPassword } = await lib();
    const number = phone();
    const res = await signUpWithPassword(db, "phone", number, GOOD);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const row = await stored(res.value.id);
    expect(row.phone).toBe(number);
    expect(row.email).toBeNull();
    expect(row.phoneVerifiedAt).toBeNull();
    expect(row.countryCode).toBe("IN");
  });

  it("refuses an email or number that already has an account, whatever the case", async () => {
    const { db, signUpWithPassword } = await lib();
    const address = email("dup");
    expect((await signUpWithPassword(db, "email", address, GOOD)).ok).toBe(true);
    const taken = { ok: false, field: "identifier", error: "An account with this email or number already exists. Please log in instead." };
    expect(await signUpWithPassword(db, "email", address, "another-pass-99")).toMatchObject(taken);
    expect(await signUpWithPassword(db, "email", address.toUpperCase(), "another-pass-99")).toMatchObject(taken);

    const number = phone();
    expect((await signUpWithPassword(db, "phone", number, GOOD)).ok).toBe(true);
    expect(await signUpWithPassword(db, "phone", number, "another-pass-99")).toMatchObject(taken);
  });

  it("refuses a weak password before creating anything", async () => {
    const { db, signUpWithPassword, findUserByContact } = await lib();
    const address = email("weak");
    expect(await signUpWithPassword(db, "email", address, "short")).toMatchObject({ ok: false, field: "password", params: { n: 8 } });
    expect(await signUpWithPassword(db, "email", address, address)).toMatchObject({ ok: false, field: "password" });
    expect(await findUserByContact(db, "email", address)).toBeNull();
  });
});

describe("logInWithPassword", () => {
  it("logs in with the right password, in any case of the email", async () => {
    const { db, signUpWithPassword, logInWithPassword } = await lib();
    const address = email("login");
    const made = await signUpWithPassword(db, "email", address, GOOD);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    const res = await logInWithPassword(db, "email", address, GOOD);
    expect(res).toMatchObject({ ok: true, value: { id: made.value.id } });
    expect((await logInWithPassword(db, "email", address.toUpperCase(), GOOD)).ok).toBe(true);
  });

  it("gives the same answer for a wrong password and an unknown account", async () => {
    const { db, signUpWithPassword, logInWithPassword } = await lib();
    const address = email("wrong");
    expect((await signUpWithPassword(db, "email", address, GOOD)).ok).toBe(true);
    const wrong = await logInWithPassword(db, "email", address, "not-the-password");
    const unknown = await logInWithPassword(db, "email", email("nobody"), GOOD);
    const unknownPhone = await logInWithPassword(db, "phone", phone(), GOOD);
    expect(wrong).toEqual({ ok: false, error: NO_MATCH, field: "password", params: undefined });
    expect(unknown).toEqual(wrong);
    expect(unknownPhone).toEqual(wrong);
  });

  it("refuses an account that has no password (made with a code)", async () => {
    const { db, createUser, logInWithPassword } = await lib();
    const address = email("code-only");
    await createUser(db, "email", address, true);
    expect(await logInWithPassword(db, "email", address, GOOD)).toMatchObject({ ok: false, error: NO_MATCH });
  });

  it("locks the account for 15 minutes after 5 wrong tries, even for the right password", async () => {
    const { db, users, eq, signUpWithPassword, logInWithPassword, MAX_FAILED_LOGINS, LOCK_MINUTES } = await lib();
    expect(MAX_FAILED_LOGINS).toBe(5);
    expect(LOCK_MINUTES).toBe(15);
    const address = email("lock");
    const made = await signUpWithPassword(db, "email", address, GOOD);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    for (let i = 1; i <= 4; i++) {
      expect(await logInWithPassword(db, "email", address, `wrong-guess-${i}`)).toMatchObject({ ok: false, error: NO_MATCH });
      expect((await stored(made.value.id)).failedLogins).toBe(i);
    }
    const before = Date.now();
    expect(await logInWithPassword(db, "email", address, "wrong-guess-5")).toMatchObject({ ok: false, error: NO_MATCH });
    const locked = await stored(made.value.id);
    expect(locked.lockedUntil).not.toBeNull();
    const ms = locked.lockedUntil!.getTime() - before;
    expect(ms).toBeGreaterThan(14 * 60_000);
    expect(ms).toBeLessThanOrEqual(15 * 60_000 + 5_000);

    // 6th try, with the right password: still refused while locked.
    const sixth = await logInWithPassword(db, "email", address, GOOD);
    expect(sixth).toEqual({ ok: false, error: "Too many wrong passwords. Please wait {n} minutes and try again.", field: "password", params: { n: 15 } });

    // Once the lock has run out, the right password works and the lock is cleared.
    await db.update(users).set({ lockedUntil: new Date(Date.now() - 1000) }).where(eq(users.id, made.value.id));
    expect((await logInWithPassword(db, "email", address, GOOD)).ok).toBe(true);
    const after = await stored(made.value.id);
    expect(after.lockedUntil).toBeNull();
    expect(after.failedLogins).toBe(0);
  });

  it("starts counting wrong tries again after a successful login", async () => {
    const { db, signUpWithPassword, logInWithPassword } = await lib();
    const number = phone();
    const made = await signUpWithPassword(db, "phone", number, GOOD);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    for (let i = 0; i < 4; i++) await logInWithPassword(db, "phone", number, `wrong-guess-${i}`);
    expect((await stored(made.value.id)).failedLogins).toBe(4);
    expect((await logInWithPassword(db, "phone", number, GOOD)).ok).toBe(true);
    expect((await stored(made.value.id)).failedLogins).toBe(0);
    // Four more wrong tries do not lock it, because the count started again.
    for (let i = 0; i < 4; i++) await logInWithPassword(db, "phone", number, `wrong-again-${i}`);
    const row = await stored(made.value.id);
    expect(row.failedLogins).toBe(4);
    expect(row.lockedUntil).toBeNull();
    expect((await logInWithPassword(db, "phone", number, GOOD)).ok).toBe(true);
  });

  it("refuses a suspended account with the right password", async () => {
    const { db, users, eq, signUpWithPassword, logInWithPassword } = await lib();
    const address = email("suspended");
    const made = await signUpWithPassword(db, "email", address, GOOD);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    await db.update(users).set({ status: "suspended" }).where(eq(users.id, made.value.id));
    expect(await logInWithPassword(db, "email", address, GOOD)).toMatchObject({ ok: false, error: "This account is suspended. Please contact support." });
    // A wrong password still gives the usual answer.
    expect(await logInWithPassword(db, "email", address, "wrong-guess-0")).toMatchObject({ ok: false, error: NO_MATCH });
  });
});

describe("accountForProvenContact", () => {
  it("gives a password account to whoever proves its email, removing the password and ending its sessions", async () => {
    const { db, signUpWithPassword, accountForProvenContact, logInWithPassword } = await lib();
    const address = email("proven");
    const made = await signUpWithPassword(db, "email", address, GOOD);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    await addSession(made.value.id);
    await addSession(made.value.id);
    expect(await sessionIds(made.value.id)).toHaveLength(2);

    const before = Date.now();
    const found = await accountForProvenContact(db, "email", address.toUpperCase());
    expect(found).not.toBe("taken");
    expect(found).not.toBeNull();
    if (!found || found === "taken") return;
    expect(found.id).toBe(made.value.id);
    expect(found.passwordHash).toBeNull();
    expect(found.emailVerifiedAt).not.toBeNull();

    const row = await stored(made.value.id);
    expect(row.passwordHash).toBeNull();
    expect(row.emailVerifiedAt!.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(await sessionIds(made.value.id)).toEqual([]);
    // The old password no longer works.
    expect(await logInWithPassword(db, "email", address, GOOD)).toMatchObject({ ok: false, error: NO_MATCH });
  });

  it("does the same for a mobile number", async () => {
    const { db, signUpWithPassword, accountForProvenContact } = await lib();
    const number = phone();
    const made = await signUpWithPassword(db, "phone", number, GOOD);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    const found = await accountForProvenContact(db, "phone", number);
    expect(found && found !== "taken" ? found.id : found).toBe(made.value.id);
    const row = await stored(made.value.id);
    expect(row.phoneVerifiedAt).not.toBeNull();
    expect(row.passwordHash).toBeNull();
  });

  it("returns an account that already proved it as it is, keeping its password and sessions", async () => {
    const { db, users, eq, signUpWithPassword, accountForProvenContact } = await lib();
    const address = email("already");
    const made = await signUpWithPassword(db, "email", address, GOOD);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    const provenAt = new Date(Date.now() - 86_400_000);
    await db.update(users).set({ emailVerifiedAt: provenAt }).where(eq(users.id, made.value.id));
    const session = await addSession(made.value.id);
    const found = await accountForProvenContact(db, "email", address);
    expect(found && found !== "taken" ? found.id : found).toBe(made.value.id);
    const row = await stored(made.value.id);
    expect(row.passwordHash).toMatch(/^scrypt\$/);
    expect(row.emailVerifiedAt!.getTime()).toBe(provenAt.getTime());
    expect(await sessionIds(made.value.id)).toEqual([session]);
  });

  it('says "taken" when the email was only typed into an account that proved its phone', async () => {
    const { db, users, accountForProvenContact } = await lib();
    const address = email("typed");
    const [owner] = await db
      .insert(users)
      .values({ role: "patient", phone: phone(), phoneVerifiedAt: new Date(), email: address, passwordHash: "scrypt$1$1$1$x$y" })
      .returning();
    const session = await addSession(owner!.id);
    expect(await accountForProvenContact(db, "email", address)).toBe("taken");
    // Nothing on that account changed.
    const row = await stored(owner!.id);
    expect(row.emailVerifiedAt).toBeNull();
    expect(row.passwordHash).toBe("scrypt$1$1$1$x$y");
    expect(await sessionIds(owner!.id)).toEqual([session]);
  });

  it("returns null when no account uses it", async () => {
    const { db, accountForProvenContact } = await lib();
    expect(await accountForProvenContact(db, "email", email("none"))).toBeNull();
    expect(await accountForProvenContact(db, "phone", phone())).toBeNull();
  });
});

describe("setPassword", () => {
  it("sets the new password and ends every other session but the one given", async () => {
    const { db, signUpWithPassword, setPassword, logInWithPassword } = await lib();
    const address = email("change");
    const made = await signUpWithPassword(db, "email", address, GOOD);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    const keep = await addSession(made.value.id);
    await addSession(made.value.id);
    await addSession(made.value.id);
    expect(await setPassword(db, made.value, "harbour-violet-77", keep)).toEqual({ ok: true, value: null });
    expect(await sessionIds(made.value.id)).toEqual([keep]);
    expect((await logInWithPassword(db, "email", address, "harbour-violet-77")).ok).toBe(true);
    expect((await logInWithPassword(db, "email", address, GOOD)).ok).toBe(false);
  });

  it("ends every session when none is kept, and refuses a weak password", async () => {
    const { db, signUpWithPassword, setPassword } = await lib();
    const address = email("change-all");
    const made = await signUpWithPassword(db, "email", address, GOOD);
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    await addSession(made.value.id);
    expect(await setPassword(db, made.value, address)).toMatchObject({ ok: false, field: "password" });
    expect(await sessionIds(made.value.id)).toHaveLength(1);
    expect((await setPassword(db, made.value, "harbour-violet-77")).ok).toBe(true);
    expect(await sessionIds(made.value.id)).toEqual([]);
  });
});

describe("reset links made by an admin", () => {
  async function adminAndPatient() {
    const { db, users, eq, signUpWithPassword } = await lib();
    const [admin] = await db.select().from(users).where(eq(users.role, "super_admin"));
    expect(admin, "the first admin from the first test").toBeTruthy();
    const address = email("reset");
    const made = await signUpWithPassword(db, "email", address, GOOD);
    expect(made.ok).toBe(true);
    if (!made.ok) throw new Error("sign up failed");
    return { admin: admin!, patient: made.value, address };
  }

  it("refuses to make a link for an admin, or for yourself", async () => {
    const { db, users, createResetLink } = await lib();
    const { admin, patient } = await adminAndPatient();
    const msg = "Admins change their own password under Password.";
    expect(await createResetLink(db, admin, admin.id)).toMatchObject({ ok: false, error: msg });
    const [other] = await db.insert(users).values({ role: "super_admin", email: email("admin2") }).returning();
    expect(await createResetLink(db, admin, other!.id)).toMatchObject({ ok: false, error: msg });
    expect(await createResetLink(db, { id: patient.id, role: "super_admin" }, patient.id)).toMatchObject({ ok: false, error: msg });
  });

  it("works once, sets the password and ends the person's sessions", async () => {
    const { db, createResetLink, findResetLink, redeemResetLink, logInWithPassword } = await lib();
    const { admin, patient, address } = await adminAndPatient();
    await addSession(patient.id);
    const link = await createResetLink(db, admin, patient.id);
    expect(link.ok).toBe(true);
    if (!link.ok) return;
    expect(link.value).toMatch(/^[\w-]{20,80}$/);
    expect((await findResetLink(db, link.value))?.user.id).toBe(patient.id);

    // A weak password does not use the link up.
    expect(await redeemResetLink(db, link.value, "short")).toMatchObject({ ok: false, field: "password" });
    const used = await redeemResetLink(db, link.value, "meadow-copper-58");
    expect(used).toMatchObject({ ok: true, value: { id: patient.id } });
    expect(await sessionIds(patient.id)).toEqual([]);
    expect((await logInWithPassword(db, "email", address, "meadow-copper-58")).ok).toBe(true);
    expect((await logInWithPassword(db, "email", address, GOOD)).ok).toBe(false);

    const again = await redeemResetLink(db, link.value, "another-choice-12");
    expect(again).toMatchObject({ ok: false, error: "This link has expired or was already used. Please ask us for a new one." });
    expect(await findResetLink(db, link.value)).toBeNull();
    expect((await logInWithPassword(db, "email", address, "another-choice-12")).ok).toBe(false);
  });

  it("does not work after it expires", async () => {
    const { db, otpCodes, and, eq, createResetLink, redeemResetLink } = await lib();
    const { admin, patient } = await adminAndPatient();
    const link = await createResetLink(db, admin, patient.id);
    expect(link.ok).toBe(true);
    if (!link.ok) return;
    await db
      .update(otpCodes)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(and(eq(otpCodes.identifier, `user:${patient.id}`), eq(otpCodes.purpose, "password_reset")));
    expect(await redeemResetLink(db, link.value, "meadow-copper-58")).toMatchObject({ ok: false, error: "This link has expired or was already used. Please ask us for a new one." });
  });

  it("replaces an earlier link, and refuses made up tokens", async () => {
    const { db, createResetLink, redeemResetLink, findResetLink } = await lib();
    const { admin, patient } = await adminAndPatient();
    const first = await createResetLink(db, admin, patient.id);
    const second = await createResetLink(db, admin, patient.id);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(await findResetLink(db, first.value)).toBeNull();
    expect((await redeemResetLink(db, first.value, "meadow-copper-58")).ok).toBe(false);
    expect((await redeemResetLink(db, second.value, "meadow-copper-58")).ok).toBe(true);
    expect(await findResetLink(db, "x".repeat(32))).toBeNull();
    expect(await findResetLink(db, "' or 1=1 --")).toBeNull();
  });
});

/* Fixes from the review of the first version. */
describe("an account is never handed to someone else", () => {
  it('says "taken" for an email typed at onboarding into an account made with a phone and a password', async () => {
    const { db, users, eq, signUpWithPassword, accountForProvenContact } = await lib();
    const number = phone();
    const made = await signUpWithPassword(db, "phone", number, GOOD);
    if (!made.ok) throw new Error(made.error);
    const typed = email("onboarding");
    await db.update(users).set({ email: typed, onboarded: true }).where(eq(users.id, made.value.id));
    expect(await accountForProvenContact(db, "email", typed)).toBe("taken");
    expect((await stored(made.value.id)).passwordHash).toMatch(/^scrypt\$/);
  });

  it('says "taken" for a staff account and for one that logs in with Google', async () => {
    const { db, users, eq, oauthAccounts, signUpWithPassword, accountForProvenContact } = await lib();
    const doctorEmail = email("staff");
    const doctor = await signUpWithPassword(db, "email", doctorEmail, GOOD);
    if (!doctor.ok) throw new Error(doctor.error);
    await db.update(users).set({ role: "doctor", mfaSecretEnc: "secret", mfaEnabledAt: new Date() }).where(eq(users.id, doctor.value.id));
    expect(await accountForProvenContact(db, "email", doctorEmail)).toBe("taken");
    expect((await stored(doctor.value.id)).mfaSecretEnc).toBe("secret");

    const typed = email("google");
    const [g] = await db.insert(users).values({ role: "patient", email: typed }).returning();
    await db.insert(oauthAccounts).values({ provider: "apple", providerUserId: `apple-${g!.id}`, userId: g!.id, email: null });
    expect(await accountForProvenContact(db, "email", typed)).toBe("taken");
  });

  it("a session from a password login that was still running when the owner proved the address never works", async () => {
    const { db, signUpWithPassword, accountForProvenContact, logInWithPassword } = await lib();
    const { createSession, getSession } = await import("@/server/auth/session");
    const address = email("race");
    const made = await signUpWithPassword(db, "email", address, GOOD);
    if (!made.ok) throw new Error(made.error);
    // The other person's login has checked the password...
    const login = await logInWithPassword(db, "email", address, GOOD);
    if (!login.ok) throw new Error(login.error);
    // ...the real owner proves the address and takes the account...
    const taken = await accountForProvenContact(db, "email", address);
    expect(taken && taken !== "taken" ? taken.authVersion : null).toBe(login.value.authVersion + 1);
    // ...and only then is the other session saved.
    await createSession(made.value.id, { authVersion: login.value.authVersion });
    expect(await getSession()).toBeNull();
    // A session made now works.
    await createSession(made.value.id);
    expect((await getSession())?.user.id).toBe(made.value.id);
  });

  it("a password change makes sessions from before it stop working, except the one kept", async () => {
    const { db, sessions, eq, signUpWithPassword, setPassword } = await lib();
    const made = await signUpWithPassword(db, "email", email("version"), GOOD);
    if (!made.ok) throw new Error(made.error);
    const keep = await addSession(made.value.id);
    expect((await setPassword(db, made.value, "harbour-violet-77", keep)).ok).toBe(true);
    const [kept] = await db.select().from(sessions).where(eq(sessions.id, keep));
    expect(kept!.authVersion).toBe((await stored(made.value.id)).authVersion);
  });
});

describe("lockout under parallel guessing", () => {
  it("lets at most 5 guesses through, however many arrive at once", async () => {
    const { db, auditLogs, and, eq, signUpWithPassword, logInWithPassword } = await lib();
    const address = email("parallel");
    const made = await signUpWithPassword(db, "email", address, GOOD);
    if (!made.ok) throw new Error(made.error);
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => logInWithPassword(db, "email", address, `wrong-guess-${i}x`)));
    expect(results.every((r) => !r.ok)).toBe(true);
    const checked = await db
      .select({ action: auditLogs.action })
      .from(auditLogs)
      .where(and(eq(auditLogs.entityId, made.value.id)));
    expect(checked.filter((a) => a.action === "auth.password_failed" || a.action === "auth.password_locked").length).toBeLessThanOrEqual(5);
    // Locked now, even for the right password.
    expect(await logInWithPassword(db, "email", address, GOOD)).toMatchObject({ ok: false, error: "Too many wrong passwords. Please wait {n} minutes and try again." });
  });
});

describe("safeNext", () => {
  it("allows plain paths on this site and nothing else", async () => {
    const { safeNext } = await lib();
    expect(safeNext("/dashboard?tab=1#top")).toBe("/dashboard?tab=1#top");
    expect(safeNext("/password")).toBe("/password");
    for (const bad of ["//evil.com", "/\\evil.com", "/\\/evil.com", "/\tevil", "https://evil.com", "evil.com", "/api/auth/logout", "", null, 5]) {
      expect(safeNext(bad), String(bad)).toBeNull();
    }
  });
});

describe("download my data", () => {
  it("never includes the password hash", async () => {
    const { db, signUpWithPassword } = await lib();
    const made = await signUpWithPassword(db, "email", email("export"), GOOD);
    if (!made.ok) throw new Error(made.error);
    const { exportMyData } = await import("@/server/patient-app");
    const data = await exportMyData(await stored(made.value.id));
    expect(JSON.stringify(data)).not.toContain("scrypt$");
    expect((data.account as { hasPassword?: boolean }).hasPassword).toBe(true);
  });
});
