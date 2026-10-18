import { getTableName, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import type { DB } from "@/db";
import { rows } from "@/db";
import * as schema from "@/db/schema";
import { dayInZone } from "@/lib/time";

const LOADED_ON = "demo:loaded_on";

/**
 * Bump this whenever the demo data changes in a way hosted demos should pick
 * up (new specialties, doctors, people). It is part of the marker, so the next
 * start reloads a demo database that was loaded with an older version.
 * v2: four specialties, doctors registered in India only, no patient location.
 * v3: doctors' treatment fees and direct payment details.
 */
export const DEMO_DATA_VERSION = "v3";

/** What the marker holds for data loaded on this day: "<day in India>#<version>". */
export function demoMarker(now = new Date()) {
  return `${dayInZone(now, "Asia/Kolkata")}#${DEMO_DATA_VERSION}`;
}

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
 * today. The marker also carries DEMO_DATA_VERSION, so new demo data replaces
 * old demo data the same way. Only a database this function loaded itself is
 * ever wiped: one that has users but no marker is left alone. Call inside a
 * transaction.
 */
export async function loadOrRefreshDemoData(db: DB, now = new Date()) {
  const current = demoMarker(now);
  const [marker] = rows<{ value: string }>(await db.execute(sql`select value #>> '{}' as value from settings where key = ${LOADED_ON}`));
  if (marker?.value === current) return "current";
  const [users] = rows<{ n: number }>(await db.execute(sql`select count(*)::int as n from users`));
  const hasData = Number(users?.n ?? 0) > 0;
  if (hasData && !marker) return "not a demo database";
  if (hasData) {
    console.log(`[db] Demo data is from ${marker!.value}: reloading it as ${current}…`);
    await wipeAppTables(db);
  }
  await ensureDemoData(db);
  await db.execute(sql`insert into settings (key, value) values (${LOADED_ON}, to_jsonb(${current}::text)) on conflict (key) do update set value = excluded.value, updated_at = now()`);
  return hasData ? "reloaded" : "loaded";
}

/** Empty this app's own tables, never anything else sharing the database. */
async function wipeAppTables(db: DB) {
  const tables = Object.values(schema)
    .filter((t) => is(t, PgTable))
    .map((t) => `"${getTableName(t as PgTable).replace(/"/g, '""')}"`);
  await db.execute(sql.raw(`truncate table ${tables.join(", ")} restart identity cascade`));
}

/**
 * When demo mode is switched off, the sample doctors, patients and bookings
 * that demo mode loaded are removed, so the live site starts empty. Only a
 * database this code loaded as a demo (it has the marker) is wiped. Call
 * inside a transaction, before ensureReferenceData.
 */
export async function removeDemoData(db: DB) {
  const [marker] = rows<{ value: string }>(await db.execute(sql`select value #>> '{}' as value from settings where key = ${LOADED_ON}`));
  if (!marker) return false;
  console.log("[db] Demo mode is off: removing the demo data so the site starts empty…");
  await wipeAppTables(db);
  return true;
}
