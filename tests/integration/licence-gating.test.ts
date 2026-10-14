import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The most important safety rule: patients only see doctors licensed where the
 * patient is. Runs against a fresh embedded database with the demo data.
 */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-test-"));
process.env.PGLITE_DIR = path.join(dir, "pglite");
process.env.STORAGE_DIR = path.join(dir, "uploads");
process.env.DEMO_AUTO_SEED = "false";

type Doctors = typeof import("@/server/doctors");
let docs: Doctors;
let close: () => Promise<void>;

beforeAll(async () => {
  const db = await import("@/db");
  const { ensureDemoData } = await import("@/db/seed/ensure");
  await ensureDemoData(await db.getDb());
  docs = await import("@/server/doctors");
  close = db.closeDb;
});

afterAll(async () => {
  await close?.();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("licence gating", () => {
  it("patients in India see Indian-licensed doctors", async () => {
    const list = await docs.listDoctors({ country: "IN", region: null }, { limit: 100 });
    expect(list.length).toBeGreaterThanOrEqual(15);
  });

  it("a patient in New York sees only doctors licensed in New York", async () => {
    const list = await docs.listDoctors({ country: "US", region: "US-NY" }, { limit: 100 });
    expect(list.map((d) => d.fullName)).toEqual(["Dr. Rajesh Iyer"]);
  });

  it("a patient in a US state without licensed doctors sees no one", async () => {
    const list = await docs.listDoctors({ country: "US", region: "US-CA" }, { limit: 100 });
    expect(list).toHaveLength(0);
  });

  it("no doctors are shown for a country without local-licence consults", async () => {
    const list = await docs.listDoctors({ country: "BD", region: null }, { limit: 100 });
    expect(list).toHaveLength(0);
  });

  it("suspended or unverified doctors never appear", async () => {
    const list = await docs.listDoctors({ country: "IN", region: null }, { limit: 100 });
    expect(list.some((d) => d.fullName === "Dr. Neeraj Bansal")).toBe(false);
  });
});
