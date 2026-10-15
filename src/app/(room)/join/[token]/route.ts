import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/config/env";
import { guestCookie, redeemInvite } from "@/server/room";

/** Invite link for a family member or interpreter without an account. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const inv = await redeemInvite(token);
  if (!inv) return NextResponse.redirect(new URL("/help?invite=expired", req.url));
  const res = NextResponse.redirect(new URL(`/consult/${inv.appointmentId}`, req.url));
  res.cookies.set(guestCookie(inv.appointmentId), token, { httpOnly: true, secure: env.secureCookies, sameSite: "lax", path: "/", expires: inv.expiresAt });
  return res;
}
