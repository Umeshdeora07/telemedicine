import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";

/** Keeps an active staff session alive (see IdleLogout). */
export async function POST() {
  const session = await getSession();
  return NextResponse.json({ ok: Boolean(session) }, { status: session ? 200 : 401 });
}
