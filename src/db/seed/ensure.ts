import { sql } from "drizzle-orm";
import type { DB } from "@/db";
import { rows } from "@/db";
import { dayInZone } from "@/lib/time";

const LOADED_ON = "demo:loaded_on";

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

/**
 * Hosted demos (PostgreSQL with DEMO_AUTO_SEED=true). Demo appointments are
 * dated around the day the data was loaded, so on the first start of a new day
 * (India time) the data is wiped and loaded again and "today's" visits stay
 * today. Only a database this function loaded itself is ever wiped: one that
 * has users but no marker is left alone. Call inside a transaction.
 */
export async function loadOrRefreshDemoData(db: DB, now = new Date()) {
  const today = dayInZone(now, "Asia/Kolkata");
  const [marker] = rows<{ value: string }>(await db.execute(sql`select value #>> '{}' as value from settings where key = ${LOADED_ON}`));
  if (marker?.value === today) return "current";
  const [users] = rows<{ n: number }>(await db.execute(sql`select count(*)::int as n from users`));
  const hasData = Number(users?.n ?? 0) > 0;
  if (hasData && !marker) return "not a demo database";
  if (hasData) {
    console.log(`[db] Demo data is from ${marker!.value}: reloading it for ${today}…`);
    const tables = rows<{ name: string }>(await db.execute(sql`select quote_ident(tablename) as name from pg_tables where schemaname = 'public'`));
    await db.execute(sql.raw(`truncate table ${tables.map((t) => t.name).join(", ")} restart identity cascade`));
  }
  await ensureDemoData(db);
  await db.execute(sql`insert into settings (key, value) values (${LOADED_ON}, to_jsonb(${today}::text)) on conflict (key) do update set value = excluded.value, updated_at = now()`);
  return hasData ? "reloaded" : "loaded";
}
