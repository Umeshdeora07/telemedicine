import { NextResponse, type NextRequest } from "next/server";
import { destroySession, getSession } from "@/server/auth/session";
import { audit } from "@/server/audit";

async function logout(req: NextRequest) {
  const session = await getSession();
  if (session) await audit({ actor: { id: session.user.id, role: session.user.role }, action: "auth.logout", entityType: "user", entityId: session.user.id, metadata: { reason: req.nextUrl.searchParams.get("reason") ?? "user" } });
  await destroySession();
  const reason = req.nextUrl.searchParams.get("reason");
  return NextResponse.redirect(new URL(reason === "idle" ? "/login?reason=idle" : "/", req.url), 303);
}

export const POST = logout;
export const GET = logout;
