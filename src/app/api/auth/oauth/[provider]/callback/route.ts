import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { oauthAccounts, users } from "@/db/schema";
import { exchangeCode, type Provider } from "@/server/auth/oauth";
import { createSession } from "@/server/auth/session";
import { grantAdminOnLogin } from "@/server/auth/admin-emails";
import { accountForProvenContact, grantPasswordReset, safeNext } from "@/server/auth/identity";
import { homeFor, isStaff, needsTwoStep } from "@/server/auth/roles";
import { audit } from "@/server/audit";

async function handle(req: NextRequest, provider: Provider, code: string | null, state: string | null, appleUser?: string | null) {
  const jar = await cookies();
  const expected = jar.get("oauth_state")?.value;
  const verifier = jar.get("oauth_verifier")?.value ?? "";
  const next = safeNext(jar.get("oauth_next")?.value);
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
    // Link to an existing account only when the provider has verified the email
    // (and never to an account where someone else only typed that address).
    const existing = info.email && info.emailVerified ? await accountForProvenContact(db, "email", info.email) : null;
    if (existing === "taken") return NextResponse.redirect(new URL("/login?error=contact_taken", req.url), 303);
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
      const verified = Boolean(info.email && info.emailVerified);
      const [created] = await db
        .insert(users)
        .values({ role: "patient", email: verified ? info.email : null, emailVerifiedAt: verified ? new Date() : null, name })
        .returning();
      userId = created!.id;
    }
    [link] = await db.insert(oauthAccounts).values({ provider, providerUserId: info.sub, userId, email: info.email }).returning();
  }
  const [user] = await db.select().from(users).where(eq(users.id, userId!));
  if (!user || user.status !== "active") return NextResponse.redirect(new URL("/login?error=suspended", req.url), 303);
  user.role = (await grantAdminOnLogin(db, user, info.emailVerified ? info.email : null)) as typeof user.role;
  await createSession(user.id);
  await grantPasswordReset(user.id);
  await audit({ actor: { id: user.id, role: user.role }, action: "auth.login", entityType: "user", entityId: user.id, metadata: { method: provider } });
  const dest = needsTwoStep(user.role)
    ? "/mfa"
    : !user.onboarded && !isStaff(user.role) && !next?.startsWith("/for-doctors/")
      ? `/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`
      : next || homeFor(user.role);
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
