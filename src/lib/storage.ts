/**
 * File storage for reports, scans, doctors' documents and generated PDFs.
 * Every file is encrypted with AES-256-GCM before it is stored. Two drivers:
 *  - disk: .data/uploads, or STORAGE_DIR (a mounted encrypted volume)
 *  - database: the stored_files table, for hosts without a lasting disk.
 *    Used on Vercel unless STORAGE_DIR is set, or with STORAGE_DRIVER=database.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { decryptBuffer, encryptBuffer, sha256 } from "./crypto";
import type { Executor } from "@/db";

const root = () => process.env.STORAGE_DIR || path.join(process.cwd(), ".data", "uploads");

// Vercel's disk is temporary (only /tmp, per instance), so files go into the database there.
const inDatabase = () =>
  process.env.STORAGE_DRIVER === "database" || (process.env.STORAGE_DRIVER !== "disk" && Boolean(process.env.VERCEL) && !process.env.STORAGE_DIR);

/**
 * `executor`: pass the open connection or transaction when saving while the
 * database itself is starting (loading demo data). getDb() waits for that
 * start to finish, so calling it from inside would wait forever.
 */
async function database(executor?: Executor) {
  const [{ getDb }, { storedFiles }, { eq }] = await Promise.all([import("@/db"), import("@/db/schema"), import("drizzle-orm")]);
  return { db: executor ?? (await getDb()), storedFiles, eq };
}

export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "audio/webm": "webm",
  "video/webm": "webm",
  "text/plain": "txt",
};
// Vercel refuses request bodies over 4.5 MB before they reach the app.
export const MAX_UPLOAD_MB = process.env.VERCEL ? 4 : 15;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** Check magic bytes so a renamed file can't pretend to be a PDF or image. */
export function sniffMime(buf: Buffer, claimed: string): string | null {
  const b = buf.subarray(0, 16);
  if (b.subarray(0, 4).toString() === "%PDF") return "application/pdf";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (b.subarray(4, 12).toString().startsWith("ftyphei") || b.subarray(4, 12).toString().startsWith("ftypmif")) return "image/heic";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return claimed.startsWith("audio") ? "audio/webm" : "video/webm";
  if (claimed === "text/plain" && !buf.includes(0)) return "text/plain";
  return null;
}

export async function saveFile(data: Buffer, executor?: Executor) {
  const now = new Date();
  const key = path.posix.join(
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    `${crypto.randomUUID()}.bin`,
  );
  if (inDatabase()) {
    const { db, storedFiles } = await database(executor);
    await db.insert(storedFiles).values({ key, data: encryptBuffer(data) });
  } else {
    const file = path.join(/*turbopackIgnore: true*/ root(), key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, encryptBuffer(data), { mode: 0o600 });
  }
  return { storageKey: key, sha256: sha256(data), sizeBytes: data.length };
}

export async function readFile(storageKey: string) {
  if (storageKey.includes("..")) throw new Error("Invalid key");
  if (inDatabase()) {
    const { db, storedFiles, eq } = await database();
    const [row] = await db.select({ data: storedFiles.data }).from(storedFiles).where(eq(storedFiles.key, storageKey));
    if (!row) throw Object.assign(new Error("File not found"), { code: "ENOENT" });
    return decryptBuffer(row.data);
  }
  // Uploaded files live outside the app bundle; tell the bundler not to trace this path.
  const blob = await fs.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ root(), storageKey));
  return decryptBuffer(blob);
}

/** Like readFile, but null when the file is gone (e.g. a host whose disk was reset while the database kept its row). */
export async function readFileIfPresent(storageKey: string) {
  try {
    return await readFile(storageKey);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function deleteFile(storageKey: string) {
  if (storageKey.includes("..")) return;
  if (inDatabase()) {
    const { db, storedFiles, eq } = await database();
    await db.delete(storedFiles).where(eq(storedFiles.key, storageKey));
    return;
  }
  await fs.rm(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ root(), storageKey), { force: true });
}
