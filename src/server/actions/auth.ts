"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { consents, patients, users } from "@/db/schema";
import { env } from "@/config/env";
import { currencyForCountry, isCurrency } from "@/config/currencies";
import { getLocale } from "@/i18n/server";
import { getT } from "@/i18n/server";
import { isValidTimeZone } from "@/lib/time";
import { decryptText, encryptText } from "@/lib/crypto";
import { generateTotpSecret, verifyTotp } from "@/lib/totp";
import { PREF_COOKIES } from "@/lib/prefs";
import { createSession, getSession, markMfaVerified, requireSession } from "@/server/auth/session";
import { parseIdentifier, requestOtp, verifyOtp } from "@/server/auth/otp";
import { homeFor, isStaff } from "@/server/auth/roles";
import { audit } from "@/server/audit";
import { DIAL_CODES } from "@/config/dial-codes";

export type LoginState =
  | { step: "start"; error?: string }
  | { step: "verify"; identifier: string; display: string; kind: "phone" | "email"; devCode?: string; error?: string; info?: string };

function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/api/") ? next : null;
}

async function requestLoginCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const t = await getT();
  const dial = String(form.get("dial") ?? "+91");
  const raw = String(form.get("identifier") ?? "");
  const id = parseIdentifier(raw, DIAL_CODES.some((d) => d.code === dial) ? dial : "+91");
  if (!id) {
    return { step: "start", error: raw.includes("@") ? t("Please enter a valid email address.") : t("Please enter a valid mobile number, for example 98100 00001.") };
  }
  const res = await requestOtp(id, "login");
  if (!res.ok) return { step: "start", error: t(res.error) };
  return { step: "verify", identifier: id.value, display: id.value, kind: id.kind, devCode: res.devCode };
}

/** One action for the whole login form: request → verify (→ resend / change number). */
export async function loginAction(prev: LoginState, form: FormData): Promise<LoginState> {
  const intent = String(form.get("intent") ?? "request");
  if (intent === "reset") return { step: "start" };
  if (intent === "resend") return resendLoginCode(prev);
  if (intent === "verify") return verifyLoginCode(prev, form);
  return requestLoginCode(prev, form);
}

async function resendLoginCode(prev: LoginState): Promise<LoginState> {
  const t = await getT();
  if (prev.step !== "verify") return prev;
  const id = parseIdentifier(prev.identifier);
  if (!id) return { step: "start" };
  const res = await requestOtp(id, "login");
  if (!res.ok) return { ...prev, error: t(res.error), info: undefined };
  return { ...prev, devCode: res.devCode, error: undefined, info: t("We sent a new code.") };
}

async function findOrCreateUser(kind: "phone" | "email", value: string) {
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(users)
    .where(kind === "phone" ? eq(users.phone, value) : sql`lower(${users.email}) = ${value}`);
  if (existing) return { user: existing, created: false };
  const dial = kind === "phone" ? DIAL_CODES.find((d) => value.startsWith(d.code)) : undefined;
  const country = dial?.country ?? "IN";
  const jar = await cookies();
  const tz = jar.get(PREF_COOKIES.tz)?.value;
  const cur = jar.get(PREF_COOKIES.currency)?.value;
  const [user] = await db
    .insert(users)
    .values({
      role: "patient",
      phone: kind === "phone" ? value : null,
      email: kind === "email" ? value : null,
      countryCode: country,
      language: await getLocale(),
      currency: isCurrency(cur) ? cur : currencyForCountry(country),
      timeZone: tz && isValidTimeZone(tz) ? tz : "Asia/Kolkata",
    })
    .returning();
  return { user: user!, created: true };
}

async function afterLogin(userId: string, next: string | null) {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) redirect("/login");
  if (user.status === "suspended") redirect("/login?error=suspended");
  const jar = await cookies();
  // Bring saved display preferences to this device.
  const p = user.preferences;
  const year = 60 * 60 * 24 * 365;
  if (p.theme) jar.set(PREF_COOKIES.theme, p.theme, { path: "/", maxAge: year });
  if (p.text) jar.set(PREF_COOKIES.text, p.text, { path: "/", maxAge: year });
  if (p.contrast) jar.set(PREF_COOKIES.contrast, p.contrast, { path: "/", maxAge: year });
  jar.set("lang", user.language, { path: "/", maxAge: year });
  if (isStaff(user.role)) redirect(`/mfa${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (!user.onboarded) redirect(`/onboarding${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  redirect(next ?? homeFor(user.role));
}

async function verifyLoginCode(prev: LoginState, form: FormData): Promise<LoginState> {
  const t = await getT();
  if (prev.step !== "verify") return prev;
  const id = parseIdentifier(prev.identifier);
  if (!id) return { step: "start" };
  const res = await verifyOtp(id, String(form.get("code") ?? ""), "login");
  if (!res.ok) return { ...prev, error: t(res.error), info: undefined };
  const { user, created } = await findOrCreateUser(id.kind, id.value);
  await createSession(user.id);
  await audit({ actor: { id: user.id, role: user.role }, action: created ? "auth.signup" : "auth.login", entityType: "user", entityId: user.id, metadata: { method: id.kind } });
  await afterLogin(user.id, safeNext(form.get("next")));
  return prev;
}

/** Demo only: sign in as a seeded account without a code. */
export async function demoLogin(form: FormData) {
  if (!env.demoMode) throw new Error("Demo login is disabled");
  const db = await getDb();
  const email = String(form.get("email") ?? "");
  const phone = String(form.get("phone") ?? "");
  const [user] = await db.select().from(users).where(email ? sql`lower(${users.email}) = ${email.toLowerCase()}` : eq(users.phone, phone));
  if (!user) redirect("/login?error=demo");
  await createSession(user.id, { mfaVerified: true });
  await audit({ actor: { id: user.id, role: user.role }, action: "auth.demo_login", entityType: "user", entityId: user.id });
  const next = safeNext(form.get("next"));
  if (!user.onboarded && !isStaff(user.role)) redirect("/onboarding");
  redirect(next ?? homeFor(user.role));
}

/* ------------------------------------------------------- two-factor (TOTP) */

export type MfaState = { error?: string; secret?: string };

export async function startMfaEnrollment(): Promise<{ secret: string }> {
  const session = await requireSession({ allowWithoutMfa: true });
  if (session.user.mfaEnabledAt) throw new Error("Already enrolled");
  const secret = generateTotpSecret();
  (await cookies()).set("mfa_enroll", encryptText(secret), { httpOnly: true, sameSite: "lax", path: "/mfa", maxAge: 600, secure: env.isProd });
  return { secret };
}

export async function verifyMfa(_prev: MfaState, form: FormData): Promise<MfaState> {
  const t = await getT();
  const session = await requireSession({ allowWithoutMfa: true });
  const db = await getDb();
  const code = String(form.get("code") ?? "");
  const next = safeNext(form.get("next"));
  if (!session.user.mfaEnabledAt) {
    const pending = (await cookies()).get("mfa_enroll")?.value;
    if (!pending) return { error: t("Your setup session expired. Please start again.") };
    const secret = decryptText(pending);
    if (!verifyTotp(secret, code)) return { error: t("That code is not right. Check the time on your phone and try again.") };
    await db.update(users).set({ mfaSecretEnc: encryptText(secret), mfaEnabledAt: new Date() }).where(eq(users.id, session.user.id));
    (await cookies()).delete({ name: "mfa_enroll", path: "/mfa" });
    await audit({ actor: { id: session.user.id, role: session.user.role }, action: "auth.mfa_enrolled", entityType: "user", entityId: session.user.id });
  } else {
    const secret = decryptText(session.user.mfaSecretEnc!);
    if (!verifyTotp(secret, code)) {
      await audit({ actor: { id: session.user.id, role: session.user.role }, action: "auth.mfa_failed", entityType: "user", entityId: session.user.id });
      return { error: t("That code is not right. Please try again.") };
    }
  }
  await markMfaVerified(session.id);
  await audit({ actor: { id: session.user.id, role: session.user.role }, action: "auth.mfa_verified", entityType: "user", entityId: session.user.id });
  redirect(next ?? homeFor(session.user.role));
}

/* --------------------------------------------------------------- onboarding */

const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(80),
  country: z.string().regex(/^[A-Z]{2}$/),
  language: z.string().min(2).max(5),
  timeZone: z.string().refine(isValidTimeZone),
  forWhom: z.enum(["self", "family", "both"]),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  sex: z.enum(["female", "male", "other"]).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().max(80).optional(),
  terms: z.literal("on"),
  telemedicine: z.literal("on"),
  whatsapp: z.literal("on").optional(),
  marketing: z.literal("on").optional(),
  next: z.string().optional(),
});

export type OnboardingState = { error?: string; fieldErrors?: Record<string, string> };

export async function completeOnboarding(_prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const t = await getT();
  const session = await requireSession({ allowNotOnboarded: true });
  const parsed = onboardingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0]);
      fe[k] =
        k === "terms" || k === "telemedicine"
          ? t("Please agree to continue.")
          : k === "name"
            ? t("Please enter your full name.")
            : k === "dob"
              ? t("Please enter your date of birth.")
              : t("Please check this field.");
    }
    return { error: t("Please fix the highlighted fields."), fieldErrors: fe };
  }
  const v = parsed.data;
  if (v.forWhom !== "family" && (!v.dob || !v.sex)) {
    return { error: t("Please fix the highlighted fields."), fieldErrors: { ...(v.dob ? {} : { dob: t("Please enter your date of birth.") }), ...(v.sex ? {} : { sex: t("Please choose one.") }) } };
  }
  const db = await getDb();
  const u = session.user;
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        name: v.name,
        countryCode: v.country,
        language: v.language,
        timeZone: v.timeZone,
        currency: currencyForCountry(v.country),
        email: u.email ?? (v.email || null),
        role: v.forWhom === "family" ? "caregiver" : "patient",
        onboarded: true,
        whatsappOptIn: v.whatsapp === "on",
      })
      .where(eq(users.id, u.id));
    if (v.forWhom !== "family") {
      const [existing] = await tx.select({ id: patients.id }).from(patients).where(and(eq(patients.userId, u.id)));
      if (!existing) {
        await tx.insert(patients).values({
          userId: u.id,
          ownerUserId: u.id,
          fullName: v.name,
          dob: v.dob || null,
          sex: (v.sex || null) as "female" | "male" | "other" | null,
          phone: u.phone,
          email: u.email ?? (v.email || null),
          country: v.country,
          city: v.city || null,
          preferredLanguage: v.language,
        });
      }
    }
    const rows = [
      { type: "terms", granted: true },
      { type: "privacy", granted: true },
      { type: "telemedicine", granted: true },
      { type: "whatsapp", granted: v.whatsapp === "on" },
      { type: "marketing", granted: v.marketing === "on" },
    ];
    await tx.insert(consents).values(rows.map((r) => ({ userId: u.id, ...r, version: "1.0", method: "checkbox" })));
  });
  const jar = await cookies();
  jar.set("lang", v.language, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  jar.set(PREF_COOKIES.currency, currencyForCountry(v.country), { path: "/", maxAge: 60 * 60 * 24 * 365 });
  await audit({ actor: { id: u.id, role: u.role }, action: "auth.onboarded", entityType: "user", entityId: u.id, metadata: { forWhom: v.forWhom } });
  const next = safeNext(v.next);
  redirect(v.forWhom === "family" ? "/family?welcome=1" : (next ?? "/dashboard?welcome=1"));
}

export async function currentUserHome() {
  const s = await getSession();
  return s ? homeFor(s.user.role) : "/";
}

/** Demo only: show the current authenticator code so testers can get through two-factor. */
export async function demoCurrentTotp(): Promise<string | null> {
  if (!env.demoMode) return null;
  const session = await requireSession({ allowWithoutMfa: true });
  const { totpAt } = await import("@/lib/totp");
  if (session.user.mfaSecretEnc) return totpAt(decryptText(session.user.mfaSecretEnc));
  const pending = (await cookies()).get("mfa_enroll")?.value;
  return pending ? totpAt(decryptText(pending)) : null;
}
