import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/config/env";
import { authorizationUrl, oauthConfigured, type Provider } from "@/server/auth/oauth";
import { safeNext } from "@/server/auth/identity";

export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (provider !== "google" && provider !== "apple") return new NextResponse("Not found", { status: 404 });
  if (!oauthConfigured(provider as Provider)) return NextResponse.redirect(new URL("/login?error=oauth_not_configured", req.url));
  const { url, state, verifier } = authorizationUrl(provider as Provider);
  const jar = await cookies();
  const opts = { httpOnly: true, secure: env.secureCookies, path: "/", maxAge: 600, sameSite: provider === "apple" ? ("none" as const) : ("lax" as const) };
  jar.set("oauth_state", state, opts);
  jar.set("oauth_verifier", verifier, opts);
  const next = req.nextUrl.searchParams.get("next");
  const safe = safeNext(next);
  if (safe) jar.set("oauth_next", safe, opts);
  return NextResponse.redirect(url);
}
