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
import type { ReservedSql } from "postgres";
import { env } from "@/config/env";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type Executor = DB | Tx;

type State = {
  db: DB;
  ready: Promise<void>;
  kind: "postgres" | "pglite";
  close: () => Promise<void>;
  /** PostgreSQL only: a dedicated connection, for session-level advisory locks. */
  reserve?: () => Promise<ReservedSql>;
};

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
      // Servers starting together (a deploy overlapping the old instance, or
      // several instances) take turns: one migrates, the rest then find
      // nothing to do. The lock lives on one reserved connection.
      const lock = await client.reserve();
      try {
        await lock`select pg_advisory_lock(20261015)`;
        if (process.env.DB_AUTO_MIGRATE !== "false") await migrate(db, { migrationsFolder: MIGRATIONS });
        // Hosted demos (render.yaml) opt in to loading demo data, and reloading
        // it each new day, in one transaction so a failure leaves nothing half-done.
        if (env.demoMode && process.env.DEMO_AUTO_SEED === "true") {
          const { loadOrRefreshDemoData } = await import("./seed/ensure");
          await db.transaction((tx) => loadOrRefreshDemoData(tx as unknown as DB));
        }
      } finally {
        await lock`select pg_advisory_unlock(20261015)`.catch(() => {});
        lock.release();
      }
    })();
    return { db, ready, kind: "postgres", close: () => client.end(), reserve: () => client.reserve() };
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
    if (env.demoMode && process.env.DEMO_AUTO_SEED !== "false") {
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
  if (!g.__telemedDb) {
    initPromise ??= init().then(
      (s) => (g.__telemedDb = s),
      (e) => {
        initPromise = undefined;
        throw e;
      },
    );
  }
  const s = g.__telemedDb ?? (await initPromise!);
  try {
    await s.ready;
  } catch (e) {
    // Don't keep a failed start (database unreachable, migration error) for
    // the life of the process: drop it so the next request tries again.
    if (g.__telemedDb === s) {
      g.__telemedDb = undefined;
      initPromise = undefined;
      await s.close().catch(() => {});
    }
    throw e;
  }
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

/**
 * Runs fn only if no other server holds the lock right now, else returns null.
 * Used so background jobs run on one server at a time. The embedded database
 * has a single process, so there it always runs.
 */
export async function withExclusiveLock<T>(key: number, fn: () => Promise<T>): Promise<T | null> {
  const s = await state();
  if (!s.reserve) return fn();
  const conn = await s.reserve();
  try {
    const [row] = await conn<{ ok: boolean }[]>`select pg_try_advisory_lock(${key}) as ok`;
    if (!row?.ok) return null;
    try {
      return await fn();
    } finally {
      await conn`select pg_advisory_unlock(${key})`.catch(() => {});
    }
  } finally {
    conn.release();
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
