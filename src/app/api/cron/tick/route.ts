import { NextResponse, type NextRequest } from "next/server";
import { tick } from "@/server/jobs";
import { safeEqual } from "@/lib/crypto";

// Jobs can take a while on a cold start (database migration and demo data load).
export const maxDuration = 60;

/**
 * Runs the background jobs once, for hosts without an always-on server.
 * Requires Authorization: Bearer <CRON_SECRET>. Vercel Cron calls it with GET
 * and sends that header itself; other cron services may use GET or POST.
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(got, secret)) return new NextResponse("Unauthorised", { status: 401 });
  return NextResponse.json({ ok: true, result: await tick() }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = handle;
export const POST = handle;
