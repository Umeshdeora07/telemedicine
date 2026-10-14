/**
 * File storage for reports, scans and generated PDFs. Every file is
 * encrypted with AES-256-GCM before it touches disk. The local driver writes
 * to .data/uploads; set STORAGE_DIR to a mounted encrypted volume, or swap in
 * an S3-compatible driver (keep the bucket in an Indian region for Indian
 * patients' data).
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { decryptBuffer, encryptBuffer, sha256 } from "./crypto";

const root = () => process.env.STORAGE_DIR || path.join(process.cwd(), ".data", "uploads");

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
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

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

export async function saveFile(data: Buffer) {
  const now = new Date();
  const key = path.posix.join(
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    `${crypto.randomUUID()}.bin`,
  );
  const file = path.join(/*turbopackIgnore: true*/ root(), key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, encryptBuffer(data), { mode: 0o600 });
  return { storageKey: key, sha256: sha256(data), sizeBytes: data.length };
}

export async function readFile(storageKey: string) {
  if (storageKey.includes("..")) throw new Error("Invalid key");
  // Uploaded files live outside the app bundle; tell the bundler not to trace this path.
  const blob = await fs.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ root(), storageKey));
  return decryptBuffer(blob);
}

export async function deleteFile(storageKey: string) {
  if (storageKey.includes("..")) return;
  await fs.rm(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ root(), storageKey), { force: true });
}
