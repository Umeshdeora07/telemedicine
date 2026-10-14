import "server-only";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { otpCodes } from "@/db/schema";
import { env } from "@/config/env";
import { brand } from "@/config/brand";
import { keyedHash, numericCode, safeEqual } from "@/lib/crypto";
import { sendEmail, sendSms } from "../notify/channels";

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

export async function requestOtp(id: Identifier, purpose = "login", meta?: Record<string, unknown>) {
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
    return { ok: false as const, error: `Please wait ${RESEND_SECONDS} seconds before asking for a new code.` };
  }
  const code = numericCode(6);
  await db.insert(otpCodes).values({
    identifier: id.value,
    purpose,
    codeHash: hashFor(id.value, purpose, code),
    expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
    meta,
  });
  const text =
    purpose === "family_consent"
      ? `${code} is your ${brand.name} code to let ${String(meta?.caregiverName ?? "a family member")} manage your care. Share it only if you agree. Valid ${TTL_MINUTES} min.`
      : `${code} is your ${brand.name} login code. It is valid for ${TTL_MINUTES} minutes. Never share it with anyone.`;
  if (id.kind === "phone") await sendSms(id.value, text);
  else await sendEmail(id.value, `${brand.name} code: ${code}`, text);
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
  if (!safeEqual(row.codeHash, hashFor(id.value, purpose, clean))) {
    await db.update(otpCodes).set({ attempts: sql`${otpCodes.attempts} + 1` }).where(eq(otpCodes.id, row.id));
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return { ok: false as const, error: left > 0 ? `That code is not right. ${left} tries left.` : "Too many wrong attempts. Please ask for a new code." };
  }
  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, row.id));
  return { ok: true as const, meta: row.meta };
}
