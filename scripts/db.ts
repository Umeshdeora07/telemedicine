/**
 * Database tasks.
 *   npm run db:migrate   apply migrations
 *   npm run db:seed      load demo data into an empty database
 *   npm run db:reset     DELETE EVERYTHING and reload demo data (local only)
 */
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";

async function main() {
  const cmd = process.argv[2];
  process.env.DEMO_AUTO_SEED = "false";
  if (cmd === "reset") {
    if (process.env.DATABASE_URL && process.env.ALLOW_DB_RESET !== "true") {
      throw new Error("Refusing to reset a PostgreSQL database. Set ALLOW_DB_RESET=true if you really mean it.");
    }
    if (!process.env.DATABASE_URL) {
      fs.rmSync(path.join(process.cwd(), ".data", "pglite"), { recursive: true, force: true });
      fs.rmSync(path.join(process.cwd(), ".data", "uploads"), { recursive: true, force: true });
    }
  }
  const { getDb, closeDb } = await import("../src/db");
  const db = await getDb();
  if (cmd === "reset" && process.env.DATABASE_URL) {
    await db.execute(sql`drop schema public cascade; create schema public; drop schema if exists drizzle cascade;`);
    await closeDb();
    return main2();
  }
  if (cmd === "seed" || cmd === "reset") {
    const { ensureDemoData } = await import("../src/db/seed/ensure");
    const loaded = await ensureDemoData(db);
    if (!loaded) console.log("Database already has data; nothing loaded. Use db:reset to start over.");
  }
  if (cmd === "migrate") console.log("Migrations applied.");
  await closeDb();
}

async function main2() {
  const { getDb, closeDb } = await import("../src/db");
  const db = await getDb();
  const { ensureDemoData } = await import("../src/db/seed/ensure");
  await ensureDemoData(db);
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
