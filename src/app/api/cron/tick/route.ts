import { NextResponse, type NextRequest } from "next/server";
import { tick } from "@/server/jobs";
import { safeEqual } from "@/lib/crypto";

/** External cron trigger (for serverless hosting). Requires Authorization: Bearer <CRON_SECRET>. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(got, secret)) return new NextResponse("Unauthorised", { status: 401 });
  return NextResponse.json({ ok: true, result: await tick() });
}
