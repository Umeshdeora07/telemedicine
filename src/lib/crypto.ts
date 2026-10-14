/**
 * Encryption at rest (AES-256-GCM), prescription signing (Ed25519) and token
 * hashing. Keys come from the environment in production; for local demo runs
 * they are generated once into .data/secrets.json.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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
  const demo = process.env.DEMO_MODE !== "false" || process.env.NODE_ENV !== "production";
  if (!demo) {
    throw new Error(
      "Missing DATA_ENCRYPTION_KEY, SIGNING_PRIVATE_KEY, SIGNING_PUBLIC_KEY or HASH_SECRET. Run `npm run keys` to generate them.",
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
