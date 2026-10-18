import "server-only";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { otpCodes } from "@/db/schema";
import { env } from "@/config/env";
import { brand } from "@/config/brand";
import { keyedHash, numericCode, safeEqual } from "@/lib/crypto";
import { checkPhoneVerification, emailConfigured, phoneCodesConfigured, sendEmail, sendSms, startPhoneVerification, verifyConfigured } from "../notify/channels";

const TTL_MINUTES = 10;
const MAX_SENDS_PER_15_MIN = 5;
const RESEND_SECONDS = 30;
const MAX_ATTEMPTS = 5;

export type Identifier = { kind: "phone" | "email"; value: string };

/** Normalise "98100 00001" (India default) or "+44 7700…" or an email. */
export function parseIdentifier(raw: string, dialCode = "+91"): Identifier | null {
  const v = raw.trim();
  if (v.includes("@")) {
    const email = v.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? { kind: "email", value: email } : null;
  }
  let digits = v.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (!digits.startsWith("+")) {
    digits = digits.replace(/^0+/, "");
    digits = dialCode + digits;
  }
  return /^\+\d{8,15}$/.test(digits) ? { kind: "phone", value: digits } : null;
}

const hashFor = (identifier: string, purpose: string, code: string) => keyedHash(`otp:${purpose}:${identifier}:${code}`);

/** Stored instead of a code hash when Twilio Verify holds the code (a keyed hash never looks like this). */
const TWILIO_VERIFY = "twilio-verify";

/** Real sends: Twilio Verify for phones when set up (outside demo mode, which shows the code on screen). */
const viaVerify = (id: Identifier) => id.kind === "phone" && !env.demoMode && verifyConfigured();

export async function requestOtp(id: Identifier, purpose = "login", meta?: Record<string, unknown>) {
  // A real site must not pretend to send a code it can't deliver.
  if (!env.demoMode && process.env.NODE_ENV === "production" && !(id.kind === "phone" ? phoneCodesConfigured() : emailConfigured())) {
    return {
      ok: false as const,
      error: id.kind === "phone" ? "Signing in by text message isn't available yet. Please use your email address." : "Signing in by email isn't available yet. Please use your mobile number.",
    };
  }
  const db = await getDb();
  const since = new Date(Date.now() - 15 * 60_000);
  const recent = await db
    .select({ createdAt: otpCodes.createdAt })
    .from(otpCodes)
    .where(and(eq(otpCodes.identifier, id.value), eq(otpCodes.purpose, purpose), gt(otpCodes.createdAt, since)))
    .orderBy(desc(otpCodes.createdAt));
  if (recent.length >= MAX_SENDS_PER_15_MIN) {
    return { ok: false as const, error: "Too many codes requested. Please wait 15 minutes and try again." };
  }
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < RESEND_SECONDS * 1000) {
    return { ok: false as const, error: "Please wait {n} seconds before asking for a new code.", params: { n: RESEND_SECONDS } };
  }
  const verify = viaVerify(id);
  const code = numericCode(6);
  const [row] = await db
    .insert(otpCodes)
    .values({
      identifier: id.value,
      purpose,
      codeHash: verify ? TWILIO_VERIFY : hashFor(id.value, purpose, code),
      expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
      meta,
    })
    .returning({ id: otpCodes.id });
  const text =
    purpose === "family_consent"
      ? `${code} is your ${brand.name} code to let ${String(meta?.caregiverName ?? "a family member")} manage your care. Share it only if you agree. Valid ${TTL_MINUTES} min.`
      : `${code} is your ${brand.name} login code. It is valid for ${TTL_MINUTES} minutes. Never share it with anyone.`;
  const sent = verify
    ? await startPhoneVerification(id.value)
    : id.kind === "phone"
      ? await sendSms(id.value, text)
      : await sendEmail(id.value, `${brand.name} code: ${code}`, text);
  if (!sent.ok) {
    console.error(`[otp] could not send a ${id.kind} code: ${sent.error}`);
    await db.delete(otpCodes).where(eq(otpCodes.id, row!.id));
    return {
      ok: false as const,
      error:
        id.kind === "phone"
          ? "We couldn't send a text message to this number. Please check the number, or log in with your email address."
          : "We couldn't send an email to this address. Please check it, or log in another way.",
    };
  }
  return { ok: true as const, devCode: env.demoMode ? code : undefined };
}

export async function verifyOtp(id: Identifier, code: string, purpose = "login") {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.identifier, id.value),
        eq(otpCodes.purpose, purpose),
        isNull(otpCodes.consumedAt),
        gt(otpCodes.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (!row) return { ok: false as const, error: "This code has expired. Please ask for a new one." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false as const, error: "Too many wrong attempts. Please ask for a new code." };
  const clean = code.replace(/\D/g, "");
  let right: boolean;
  if (row.codeHash === TWILIO_VERIFY) {
    const result = clean.length >= 4 ? await checkPhoneVerification(id.value, clean) : "wrong";
    if (result === "error") return { ok: false as const, error: "We couldn't check the code just now. Please try again in a minute." };
    if (result === "expired") {
      await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, row.id));
      return { ok: false as const, error: "This code has expired. Please ask for a new one." };
    }
    right = result === "approved";
  } else right = safeEqual(row.codeHash, hashFor(id.value, purpose, clean));
  if (!right) {
    await db.update(otpCodes).set({ attempts: sql`${otpCodes.attempts} + 1` }).where(eq(otpCodes.id, row.id));
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return left > 0
      ? { ok: false as const, error: "That code is not right. {n} tries left.", params: { n: left } }
      : { ok: false as const, error: "Too many wrong attempts. Please ask for a new code." };
  }
  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, row.id));
  return { ok: true as const, meta: row.meta };
}
