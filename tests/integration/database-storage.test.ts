import { afterAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * On Vercel uploaded files are stored in the database. Loading the demo data
 * saves files while the database is still starting, which once made every
 * page wait forever (the save waited for the start, the start for the save).
 */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-storage-"));
process.env.PGLITE_DIR = path.join(dir, "pglite");
process.env.STORAGE_DRIVER = "database";
delete process.env.DEMO_AUTO_SEED;

type Db = typeof import("@/db");
let dbm: Db | undefined;

afterAll(async () => {
  await dbm?.closeDb();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("files stored in the database", () => {
  it("the database starts with demo data instead of hanging", async () => {
    dbm = await import("@/db");
    const started = await Promise.race([
      dbm.getDb().then(() => "ready"),
      new Promise<string>((resolve) => setTimeout(() => resolve("still waiting"), 60_000)),
    ]);
    expect(started).toBe("ready");
    const db = await dbm.getDb();
    const { sql } = await import("drizzle-orm");
    const [row] = dbm.rows<{ n: number }>(await db.execute(sql`select count(*)::int as n from stored_files`));
    expect(Number(row?.n)).toBeGreaterThan(0);
  });

  it("saves and reads a file back after start", async () => {
    const { saveFile, readFile } = await import("@/lib/storage");
    const saved = await saveFile(Buffer.from("a certificate"));
    expect((await readFile(saved.storageKey)).toString()).toBe("a certificate");
  });
});
