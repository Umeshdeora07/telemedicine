import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getSession } from "@/server/auth/session";

const sub = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

/** Save this device's push subscription (VAPID). */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorised", { status: 401 });
  const v = sub.safeParse(await req.json().catch(() => null));
  if (!v.success) return NextResponse.json({ error: "Bad subscription" }, { status: 400 });
  const db = await getDb();
  await db
    .insert(pushSubscriptions)
    .values({ userId: session.user.id, endpoint: v.data.endpoint, keys: v.data.keys })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: session.user.id, keys: v.data.keys } });
  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? null });
}
