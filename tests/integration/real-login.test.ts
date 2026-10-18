import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The live site: no demo mode, login codes sent by Twilio Verify, and the
 * first person to log in becomes the admin.
 */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-login-"));
process.env.PGLITE_DIR = path.join(dir, "pglite");
process.env.DEMO_MODE = "0";
delete process.env.ADMIN_EMAILS;

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
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("demo mode", () => {
  it("is always off on the Vercel production site", async () => {
    const { env } = await import("@/config/env");
    vi.stubEnv("DEMO_MODE", "true");
    expect(env.demoMode).toBe(true);
    vi.stubEnv("VERCEL_ENV", "production");
    expect(env.demoMode).toBe(false);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(env.demoMode).toBe(true);
  });
});

describe("phone login codes with Twilio Verify", () => {
  const twilio = () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC_test");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token");
    vi.stubEnv("TWILIO_VERIFY_SERVICE_SID", "VA_test");
    const calls: { url: string; body: URLSearchParams }[] = [];
    let failSend = false;
    vi.stubGlobal("fetch", async (url: string, init: { body: URLSearchParams }) => {
      calls.push({ url, body: init.body });
      if (url.endsWith("/Verifications")) {
        return failSend ? Response.json({ code: 60200, message: "Invalid parameter" }, { status: 400 }) : Response.json({ status: "pending" }, { status: 201 });
      }
      return Response.json({ status: init.body.get("Code") === "246810" ? "approved" : "pending" });
    });
    return { calls, failNextSend: () => (failSend = true) };
  };

  it("sends through Verify, never shows the code, and checks it with Twilio", async () => {
    const { calls } = twilio();
    const { requestOtp, verifyOtp } = await import("@/server/auth/otp");
    const phone = { kind: "phone" as const, value: "+447700900123" };
    const sent = await requestOtp(phone);
    expect(sent).toEqual({ ok: true, devCode: undefined });
    expect(calls[0]!.url).toBe("https://verify.twilio.com/v2/Services/VA_test/Verifications");
    expect(calls[0]!.body.get("To")).toBe("+447700900123");
    expect(calls[0]!.body.get("Channel")).toBe("sms");

    expect(await verifyOtp(phone, "111111")).toEqual({ ok: false, error: "That code is not right. {n} tries left.", params: { n: 4 } });
    const ok = await verifyOtp(phone, "246 810");
    expect(ok.ok).toBe(true);
    expect(calls.at(-1)!.body.get("Code")).toBe("246810");
    // The code is used up.
    expect((await verifyOtp(phone, "246810")).ok).toBe(false);
  });

  it("says so when the text message can't be sent, without using up a try", async () => {
    const { failNextSend } = twilio();
    failNextSend();
    const { requestOtp } = await import("@/server/auth/otp");
    const res = await requestOtp({ kind: "phone", value: "+919810000099" });
    expect(res.ok).toBe(false);
    const db = await dbm.getDb();
    const { otpCodes } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    expect(await db.select().from(otpCodes).where(eq(otpCodes.identifier, "+919810000099"))).toHaveLength(0);
  });

  it("does not crash when Twilio can't be reached", async () => {
    twilio();
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    const { requestOtp } = await import("@/server/auth/otp");
    expect((await requestOtp({ kind: "phone", value: "+919810000098" })).ok).toBe(false);
  });
});

describe("the first person to log in", () => {
  it("becomes the admin, once, even when two log in at the same moment", async () => {
    const db = await dbm.getDb();
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { grantAdminOnLogin } = await import("@/server/auth/admin-emails");
    const made = await db
      .insert(users)
      .values([1, 2, 3].map((i) => ({ role: "patient" as const, email: `person${i}@example.com` })))
      .returning();
    const [a, b, c] = made as [(typeof made)[0], (typeof made)[0], (typeof made)[0]];
    const roles = await Promise.all([grantAdminOnLogin(db, a, a.email), grantAdminOnLogin(db, b, b.email)]);
    expect(roles.filter((r) => r === "super_admin")).toHaveLength(1);
    const winner = roles[0] === "super_admin" ? a : b;
    const [stored] = await db.select().from(users).where(eq(users.id, winner.id));
    expect(stored!.role).toBe("super_admin");

    // Later logins stay patients, even after the admin account is gone.
    await db.update(users).set({ role: "patient" }).where(eq(users.id, winner.id));
    expect(await grantAdminOnLogin(db, c, c.email)).toBe("patient");
  });

  it("is not used when ADMIN_EMAILS names the admin", async () => {
    vi.stubEnv("ADMIN_EMAILS", "owner@example.com");
    const db = await dbm.getDb();
    const { users } = await import("@/db/schema");
    const { grantAdminOnLogin } = await import("@/server/auth/admin-emails");
    const [owner] = await db.insert(users).values({ role: "patient", email: "owner@example.com" }).returning();
    expect(await grantAdminOnLogin(db, owner!, "someone@example.com")).toBe("patient");
    expect(await grantAdminOnLogin(db, owner!, "owner@example.com")).toBe("super_admin");
  });
});
