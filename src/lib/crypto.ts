/**
 * Encryption at rest (AES-256-GCM), prescription signing (Ed25519) and token
 * hashing. Keys come from the environment in production: either the four keys
 * from `npm run keys`, or one APP_SECRET they are all derived from. For local
 * demo runs they are generated once into .data/secrets.json.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/config/env";

type Secrets = { encryptionKey: string; signingPrivateKey: string; signingPublicKey: string; hashSecret: string };

let cached: Secrets | undefined;

function loadSecrets(): Secrets {
  if (cached) return cached;
  const fromEnv = {
    encryptionKey: process.env.DATA_ENCRYPTION_KEY,
    signingPrivateKey: process.env.SIGNING_PRIVATE_KEY,
    signingPublicKey: process.env.SIGNING_PUBLIC_KEY,
    hashSecret: process.env.HASH_SECRET,
  };
  if (fromEnv.encryptionKey && fromEnv.signingPrivateKey && fromEnv.signingPublicKey && fromEnv.hashSecret) {
    cached = fromEnv as Secrets;
    return cached;
  }
  if (process.env.APP_SECRET) {
    cached = secretsFromAppSecret(process.env.APP_SECRET);
    return cached;
  }
  // Generated keys live in a local file, which only makes sense next to the
  // embedded database: a hosted PostgreSQL outlives the server's disk, and keys
  // regenerated on restart would orphan everything encrypted or signed with them.
  if (!env.demoMode || process.env.DATABASE_URL || process.env.VERCEL) {
    throw new Error(
      "Missing secrets. Set APP_SECRET (32+ random characters), or DATA_ENCRYPTION_KEY, SIGNING_PRIVATE_KEY, SIGNING_PUBLIC_KEY and HASH_SECRET from `npm run keys`.",
    );
  }
  const file = path.join(process.cwd(), ".data", "secrets.json");
  if (fs.existsSync(file)) {
    cached = JSON.parse(fs.readFileSync(file, "utf8")) as Secrets;
    return cached;
  }
  cached = generateSecrets();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(cached, null, 2), { mode: 0o600 });
  return cached;
}

/** Throws now if the keys are missing, so a misconfigured server fails at boot. */
export function checkSecrets() {
  loadSecrets();
}

// PKCS#8 DER header for an Ed25519 private key; the 32-byte seed follows it.
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

/**
 * Derives every key from one secret with HKDF-SHA256, one label per key, so a
 * host that can only generate a single random value still gets stable keys
 * across restarts. Changing APP_SECRET changes every key: stored files become
 * unreadable and existing prescriptions no longer verify.
 */
export function secretsFromAppSecret(appSecret: string): Secrets {
  if (appSecret.length < 32) throw new Error("APP_SECRET must be at least 32 characters.");
  const ikm = Buffer.from(appSecret, "utf8");
  const derive = (label: string) => Buffer.from(crypto.hkdfSync("sha256", ikm, Buffer.from("telemedicine/app-secret/v1"), Buffer.from(label), 32));
  const signingPrivateKey = Buffer.concat([ED25519_PKCS8_PREFIX, derive("signing-ed25519")]);
  const publicKey = crypto.createPublicKey(crypto.createPrivateKey({ key: signingPrivateKey, format: "der", type: "pkcs8" }));
  return {
    encryptionKey: derive("data-encryption").toString("base64"),
    signingPrivateKey: signingPrivateKey.toString("base64"),
    signingPublicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    hashSecret: derive("hash").toString("base64"),
  };
}

export function generateSecrets(): Secrets {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  return {
    encryptionKey: crypto.randomBytes(32).toString("base64"),
    signingPrivateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
    signingPublicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    hashSecret: crypto.randomBytes(32).toString("base64"),
  };
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function randomToken(bytes = 32) {
  return b64url(crypto.randomBytes(bytes));
}

export function sha256(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/** Keyed hash for short secrets (OTP codes, visit pass codes). */
export function keyedHash(input: string) {
  return crypto.createHmac("sha256", loadSecrets().hashSecret).update(input).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function key() {
  return Buffer.from(loadSecrets().encryptionKey, "base64");
}

/** AES-256-GCM. Output: iv(12) | tag(16) | ciphertext. */
export function encryptBuffer(plain: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]);
}

export function decryptBuffer(blob: Buffer) {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const data = blob.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function encryptText(plain: string) {
  return "v1:" + encryptBuffer(Buffer.from(plain, "utf8")).toString("base64");
}

export function decryptText(enc: string) {
  if (!enc.startsWith("v1:")) throw new Error("Unknown ciphertext format");
  return decryptBuffer(Buffer.from(enc.slice(3), "base64")).toString("utf8");
}

/** Deterministic JSON so signatures don't depend on key order. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  const obj = value as Record<string, unknown>;
  return (
    "{" +
    Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k]))
      .join(",") +
    "}"
  );
}

export function signPayload(payload: unknown) {
  const s = loadSecrets();
  const privateKey = crypto.createPrivateKey({ key: Buffer.from(s.signingPrivateKey, "base64"), format: "der", type: "pkcs8" });
  const data = Buffer.from(canonicalJson(payload));
  return { signature: b64url(crypto.sign(null, data, privateKey)), hash: sha256(data) };
}

export function verifyPayload(payload: unknown, signature: string) {
  const s = loadSecrets();
  const publicKey = crypto.createPublicKey({ key: Buffer.from(s.signingPublicKey, "base64"), format: "der", type: "spki" });
  try {
    return crypto.verify(null, Buffer.from(canonicalJson(payload)), publicKey, Buffer.from(signature, "base64url"));
  } catch {
    return false;
  }
}

export function publicSigningKeyPem() {
  const s = loadSecrets();
  return crypto
    .createPublicKey({ key: Buffer.from(s.signingPublicKey, "base64"), format: "der", type: "spki" })
    .export({ type: "spki", format: "pem" })
    .toString();
}

// Crockford-style alphabet without look-alike characters (no 0/O, 1/I/L).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function shortCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

export function numericCode(len = 6) {
  let out = "";
  for (let i = 0; i < len; i++) out += crypto.randomInt(0, 10).toString();
  return out;
}
