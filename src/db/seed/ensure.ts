import { sql } from "drizzle-orm";
import type { DB } from "@/db";
import { rows } from "@/db";

/** Load demo data into an empty database (local demo mode only). */
export async function ensureDemoData(db: DB) {
  const [r] = rows<{ n: number }>(await db.execute(sql`select count(*)::int as n from users`));
  if (Number(r?.n ?? 0) > 0) return false;
  const { seedDemo } = await import("./run");
  const started = Date.now();
  console.log("[db] Empty database: loading demo data…");
  await seedDemo(db);
  console.log(`[db] Demo data ready in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return true;
}
