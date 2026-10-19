import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The owner's one time fresh start on the live site: every earlier account
 * is removed and three test logins (admin, patient, doctor) are made.
 */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-testacc-"));
process.env.PGLITE_DIR = path.join(dir, "pglite");
process.env.DEMO_MODE = "0";

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

async function lib() {
  const db = await dbm.getDb();
  const schema = await import("@/db/schema");
  const orm = await import("drizzle-orm");
  const t = await import("@/db/seed/test-accounts");
  return { db, ...schema, ...orm, ...t };
}

describe("test logins on the live site", () => {
  it("removes every earlier account once, then makes an admin, a patient and a draft doctor", async () => {
    const { db, users, doctors, patients, settings, eq, ensureTestAccounts, TEST_ACCOUNTS } = await lib();
    const [old] = await db.insert(users).values({ role: "super_admin", email: "first@example.org", passwordHash: "scrypt$1$1$1$a$b" }).returning();
    await db.insert(users).values({ role: "patient", email: "second@example.org" });

    expect(await ensureTestAccounts(db)).toBe("reset");
    const all = await db.select().from(users);
    expect(all.map((u) => u.email).sort()).toEqual(TEST_ACCOUNTS.map((a) => a.email).sort());
    expect(all.find((u) => u.id === old!.id)).toBeUndefined();
    for (const a of TEST_ACCOUNTS) {
      const u = all.find((x) => x.email === a.email)!;
      expect(u.role).toBe(a.role);
      expect(u.passwordHash).toMatch(/^scrypt\$32768\$8\$1\$/);
      expect(u.onboarded).toBe(true);
    }
    const doctor = all.find((u) => u.role === "doctor")!;
    const [d] = await db.select().from(doctors).where(eq(doctors.userId, doctor.id));
    expect(d!.verificationStatus).toBe("draft");
    const patient = all.find((u) => u.role === "patient")!;
    expect(await db.select().from(patients).where(eq(patients.userId, patient.id))).toHaveLength(1);
    // The four specialties are back after the wipe.
    expect((await db.select().from((await import("@/db/schema")).specialties)).length).toBe(4);
    expect((await db.select().from(settings).where(eq(settings.key, "setup:test_accounts"))).length).toBe(1);
  });

  it("does it only once: later accounts and changed passwords stay", async () => {
    const { db, users, eq, ensureTestAccounts } = await lib();
    await db.insert(users).values({ role: "patient", email: "later@example.org" });
    await db.update(users).set({ passwordHash: "scrypt$changed" }).where(eq(users.email, "admin@caremitra.test"));
    expect(await ensureTestAccounts(db)).toBe("done");
    expect(await db.select().from(users).where(eq(users.email, "later@example.org"))).toHaveLength(1);
    const [admin] = await db.select().from(users).where(eq(users.email, "admin@caremitra.test"));
    expect(admin!.passwordHash).toBe("scrypt$changed");
  });

  it("never wipes a site that is already in real use", async () => {
    const { db, users, settings, eq, ensureTestAccounts } = await lib();
    await db.delete(settings).where(eq(settings.key, "setup:test_accounts"));
    await db.insert(users).values(Array.from({ length: 30 }, (_, i) => ({ role: "patient" as const, email: `real${i}@example.org` })));
    expect(await ensureTestAccounts(db)).toBe("added");
    expect(await db.select().from(users).where(eq(users.email, "real7@example.org"))).toHaveLength(1);
  });
});
