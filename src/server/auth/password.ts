import "server-only";
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Passwords are stored as scrypt hashes: "scrypt$N$r$p$salt$hash" (base64).
 * N = 2^15 uses 32 MB and about a tenth of a second, which slows guessing
 * without straining a small server.
 */
const N = 32768;
const R = 8;
const P = 1;
const KEY_LEN = 32;

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 200;

function derive(password: string, salt: Buffer, opts: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEY_LEN, { ...opts, maxmem: 128 * opts.N * opts.r * 2 } satisfies ScryptOptions, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

/** Hash of a password nobody has, checked when the account does not exist so both cases take as long. */
let dummy: Promise<string> | undefined;

export async function verifyPassword(password: string, stored: string | null | undefined) {
  const hash = stored ?? (await (dummy ??= hashPassword(randomBytes(16).toString("hex"))));
  const [scheme, n, r, p, salt, key] = hash.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"), { N: Number(n), r: Number(r), p: Number(p) });
  return Boolean(stored) && actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Why a new password can't be used, or null when it is fine. */
export function passwordProblem(password: string, identifier?: string) {
  if (password.length < MIN_PASSWORD) return "Please use at least {n} characters.";
  if (password.length > MAX_PASSWORD) return "That password is too long.";
  const plain = password.toLowerCase();
  if (/^(.)\1+$/.test(password) || /^(?:0?123456789?0?|password\d*|qwerty\w*|abc(?:def)?123\w*|11111111|iloveyou)$/.test(plain)) {
    return "That password is too easy to guess. Please choose another.";
  }
  if (identifier && plain === identifier.toLowerCase().replace(/^\+/, "")) return "Please don't use your email or number as the password.";
  return null;
}
