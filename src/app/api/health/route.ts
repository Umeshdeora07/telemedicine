import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Health check for the host (Render, Docker): 200 only when the database
 * answers. `?ping` skips the database; the consult tech check uses it to
 * measure network latency.
 */
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.has("ping")) return NextResponse.json({ ok: true, at: Date.now() }, { headers: NO_STORE });
  try {
    await Promise.race([
      getDb().then((db) => db.execute(sql`select 1`)),
      new Promise((_, reject) => setTimeout(() => reject(new Error("database timeout")), 10_000)),
    ]);
    return NextResponse.json({ ok: true, at: Date.now() }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false, error: "database unavailable" }, { status: 503, headers: NO_STORE });
  }
}
