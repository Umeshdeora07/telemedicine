import { NextResponse } from "next/server";

/** Liveness check (also used by the tech check to measure latency). */
export async function GET() {
  return NextResponse.json({ ok: true, at: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
