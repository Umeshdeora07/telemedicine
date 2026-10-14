import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { oauthAccounts, users } from "@/db/schema";
import { exchangeCode, type Provider } from "@/server/auth/oauth";
import { createSession } from "@/server/auth/session";
import { homeFor, isStaff } from "@/server/auth/roles";
import { audit } from "@/server/audit";

async function handle(req: NextRequest, provider: Provider, code: string | null, state: string | null, appleUser?: string | null) {
  const jar = await cookies();
  const expected = jar.get("oauth_state")?.value;
  const verifier = jar.get("oauth_verifier")?.value ?? "";
  const next = jar.get("oauth_next")?.value;
  jar.delete("oauth_state");
  jar.delete("oauth_verifier");
  jar.delete("oauth_next");
  if (!code || !state || !expected || state !== expected) return NextResponse.redirect(new URL("/login?error=oauth_state", req.url), 303);
  let info;
  try {
    info = await exchangeCode(provider, code, verifier);
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url), 303);
  }
  const db = await getDb();
  let [link] = await db.select().from(oauthAccounts).where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerUserId, info.sub)));
  let userId = link?.userId;
  if (!userId) {
    // Link to an existing account only when the provider has verified the email.
    const [existing] = info.email && info.emailVerified ? await db.select().from(users).where(sql`lower(${users.email}) = ${info.email}`) : [];
    let name = info.name ?? "";
    if (appleUser) {
      try {
        const parsed = JSON.parse(appleUser) as { name?: { firstName?: string; lastName?: string } };
        name = [parsed.name?.firstName, parsed.name?.lastName].filter(Boolean).join(" ");
      } catch {
        /* ignore */
      }
    }
    if (existing) userId = existing.id;
    else {
      const [created] = await db.insert(users).values({ role: "patient", email: info.emailVerified ? info.email : null, name }).returning();
      userId = created!.id;
    }
    [link] = await db.insert(oauthAccounts).values({ provider, providerUserId: info.sub, userId, email: info.email }).returning();
  }
  const [user] = await db.select().from(users).where(eq(users.id, userId!));
  if (!user || user.status !== "active") return NextResponse.redirect(new URL("/login?error=suspended", req.url), 303);
  await createSession(user.id);
  await audit({ actor: { id: user.id, role: user.role }, action: "auth.login", entityType: "user", entityId: user.id, metadata: { method: provider } });
  const dest = isStaff(user.role) ? "/mfa" : !user.onboarded ? "/onboarding" : next || homeFor(user.role);
  return NextResponse.redirect(new URL(dest, req.url), 303);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (provider !== "google") return new NextResponse("Not found", { status: 404 });
  return handle(req, "google", req.nextUrl.searchParams.get("code"), req.nextUrl.searchParams.get("state"));
}

// Apple posts the result back (response_mode=form_post).
export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (provider !== "apple") return new NextResponse("Not found", { status: 404 });
  const form = await req.formData();
  return handle(req, "apple", form.get("code")?.toString() ?? null, form.get("state")?.toString() ?? null, form.get("user")?.toString());
}
