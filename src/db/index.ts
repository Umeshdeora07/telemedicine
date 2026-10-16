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
import type { Sql } from "postgres";
import { env } from "@/config/env";
import { databaseUrl } from "@/lib/setup-check";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type Executor = DB | Tx;

type State = {
  db: DB;
  ready: Promise<void>;
  kind: "postgres" | "pglite";
  close: () => Promise<void>;
  /** PostgreSQL only: run fn while holding an advisory lock (see lockRunner). */
  lock?: LockRunner;
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

type LockRunner = <T>(key: number, wait: boolean, fn: () => Promise<T>) => Promise<T | null>;

/**
 * Runs fn while this server holds a transaction-level advisory lock, kept by
 * an open transaction on its own connection while fn uses the others. Unlike
 * session locks this also works through a transaction-mode pooler (Neon,
 * PgBouncer), and the lock always ends with the transaction. With wait=false
 * it returns null at once when another server holds the lock.
 */
function lockRunner(client: Sql): LockRunner {
  return async (key, wait, fn) => {
    let out: Awaited<ReturnType<typeof fn>> | null = null;
    await client.begin(async (tx) => {
      if (wait) await tx`select pg_advisory_xact_lock(${key})`;
      else {
        const [row] = await tx<{ ok: boolean }[]>`select pg_try_advisory_xact_lock(${key}) as ok`;
        if (!row?.ok) return;
      }
      out = await fn();
    });
    return out;
  };
}

/** postgres.js sends unknown URL options to the server as settings; drop the libpq-only one Neon's URLs carry. */
export function connectionUrl(raw: string) {
  try {
    const u = new URL(raw);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return raw;
  }
}

async function init(): Promise<State> {
  const url = databaseUrl()?.url;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(connectionUrl(url), {
      // At least 2: a lock holds one connection while the work uses another.
      max: Math.max(2, Number(process.env.DATABASE_POOL_SIZE || 10)),
      prepare: false,
      // Serverless instances freeze between requests; don't hold idle connections.
      idle_timeout: process.env.VERCEL ? 20 : undefined,
      connect_timeout: 15,
      onnotice: () => {},
    });
    const db = drizzle(client, { schema, casing: "snake_case" });
    const lock = lockRunner(client);
    // Servers starting together (a deploy overlapping the old instance, or
    // several serverless instances) take turns: one migrates, the rest then
    // find nothing to do.
    const ready = lock(20261015, true, async () => {
      if (process.env.DB_AUTO_MIGRATE !== "false") await migrate(db, { migrationsFolder: MIGRATIONS });
      // Demo mode loads demo data into an empty database and reloads it each
      // new day, in one transaction so a failure leaves nothing half-done.
      // A database with users that this didn't load is never touched.
      if (env.demoMode && process.env.DEMO_AUTO_SEED !== "false") {
        const { loadOrRefreshDemoData } = await import("./seed/ensure");
        await db.transaction((tx) => loadOrRefreshDemoData(tx as unknown as DB));
      }
    }).then(() => undefined);
    return { db, ready, kind: "postgres", close: () => client.end(), lock };
  }

  if (process.env.VERCEL) {
    // The embedded database needs a writable, lasting disk, which Vercel doesn't have.
    throw new Error("No database connected. In Vercel, open the project's Storage tab, connect a Neon database (it sets DATABASE_URL), then redeploy.");
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
        console.error("[db] Database start failed; will retry on the next request.", e);
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
    console.error("[db] Database start failed; will retry on the next request.", e);
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
  return s.lock ? s.lock(key, false, fn) : fn();
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
