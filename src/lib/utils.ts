import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .replace(/^(Dr\.?\s+)/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ageFrom(dob: string | Date | null | undefined, now = new Date()) {
  if (!dob) return null;
  const d = typeof dob === "string" ? new Date(dob) : dob;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function maskName(name: string) {
  return name
    .split(/\s+/)
    .map((p, i) => (i === 0 ? p : p[0] + "."))
    .join(" ");
}

export function maskPhone(phone: string | null | undefined) {
  if (!phone) return "";
  return phone.replace(/(\+?\d{2,3})\d+(\d{3})$/, "$1•••••$2");
}

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) out[k] = obj[k];
  return out;
}

/** "partially_refunded" -> "Partially refunded" (used as the English key for t()). */
export function humanize(value: string) {
  const s = value.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
