/**
 * Database connection.
 *
 * - With DATABASE_URL set, connects to PostgreSQL (recommended for staging and
 *   production; host Indian patients' data in an Indian region).
 * - Without it, runs an embedded PostgreSQL (PGlite) stored in .data/pglite,
 *   so the app works with zero setup on a laptop. It migrates and loads the
 *   demo data on first use.
 */
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type Executor = DB | Tx;

type State = { db: DB; ready: Promise<void>; kind: "postgres" | "pglite"; close: () => Promise<void> };

const g = globalThis as unknown as { __telemedDb?: State };

const MIGRATIONS = path.join(process.cwd(), "drizzle");

function pgliteDir() {
  return process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pglite");
}

/** Refuse to open the embedded database from two processes at once. */
function takeLock(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  const lock = path.join(path.dirname(dir), "pglite.lock");
  if (fs.existsSync(lock)) {
    const pid = Number(fs.readFileSync(lock, "utf8"));
    let alive = false;
    if (pid && pid !== process.pid) {
      try {
        process.kill(pid, 0);
        alive = true;
      } catch {
        alive = false;
      }
    }
    if (alive) {
      throw new Error(
        `The embedded database is already open in another process (pid ${pid}). Stop "npm run dev" before running database scripts, or set DATABASE_URL to use PostgreSQL.`,
      );
    }
  }
  fs.writeFileSync(lock, String(process.pid));
  const release = () => {
    try {
      if (fs.readFileSync(lock, "utf8") === String(process.pid)) fs.unlinkSync(lock);
    } catch {
      /* already gone */
    }
  };
  process.once("exit", release);
  return release;
}

async function init(): Promise<State> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(url, {
      max: Number(process.env.DATABASE_POOL_SIZE || 10),
      prepare: false,
      onnotice: () => {},
    });
    const db = drizzle(client, { schema, casing: "snake_case" });
    const ready = (async () => {
      if (process.env.DB_AUTO_MIGRATE !== "false") await migrate(db, { migrationsFolder: MIGRATIONS });
    })();
    return { db, ready, kind: "postgres", close: () => client.end() };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = pgliteDir();
  const release = takeLock(dir);
  const client = new PGlite(dir);
  const db = drizzle(client, { schema, casing: "snake_case" }) as unknown as DB;
  const ready = (async () => {
    await client.waitReady;
    await migrate(db as never, { migrationsFolder: MIGRATIONS });
    if (process.env.DEMO_AUTO_SEED !== "false") {
      const { ensureDemoData } = await import("./seed/ensure");
      await ensureDemoData(db);
    }
  })();
  return {
    db,
    ready,
    kind: "pglite",
    close: async () => {
      await client.close();
      release();
    },
  };
}

let initPromise: Promise<State> | undefined;

async function state(): Promise<State> {
  if (g.__telemedDb) return g.__telemedDb;
  initPromise ??= init().then((s) => (g.__telemedDb = s));
  const s = await initPromise;
  await s.ready;
  return s;
}

/** The database, ready to query (migrated, and seeded in local demo mode). */
export async function getDb(): Promise<DB> {
  const s = await state();
  await s.ready;
  return s.db;
}

export async function dbKind() {
  return (await state()).kind;
}

export async function closeDb() {
  const s = g.__telemedDb;
  if (s) {
    await s.close();
    g.__telemedDb = undefined;
    initPromise = undefined;
  }
}

export type RlsContext = { userId: string | null; role: string };

/**
 * Run queries as a specific user so the database's row-level security
 * policies (drizzle/0001_rls.sql) decide which medical records are visible.
 */
export async function withRls<T>(ctx: RlsContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.user_id', ${ctx.userId ?? ""}, true), set_config('app.role', ${ctx.role}, true)`,
    );
    await tx.execute(sql`set local role app_rls`);
    return fn(tx);
  });
}

/** Rows from db.execute(), which differ between postgres-js and PGlite. */
export function rows<T = Record<string, unknown>>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const r = result as { rows?: T[] };
  return r?.rows ?? [];
}

export { schema };
