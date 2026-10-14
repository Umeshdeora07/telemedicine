import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, withRls } from "@/db";
import { documents, prescriptions } from "@/db/schema";
import { env } from "@/config/env";
import { verifyRx, type RxSnapshot } from "@/lib/rx";
import { readFile } from "@/lib/storage";
import { prescriptionPdf } from "@/lib/pdf/prescription";
import type { SessionUser } from "./auth/session";
import { audit } from "./audit";

export function verifyUrl(number: string, signature: string) {
  return `${env.appUrl}/verify/rx/${number}?s=${signature.slice(0, 16)}`;
}

/** A prescription the user may see (patient side, its doctor, a doctor with a grant, or the linked clinic). */
export async function getPrescriptionForUser(user: SessionUser, id: string) {
  const rx = await withRls({ userId: user.id, role: user.role }, async (tx) => {
    const [r] = await tx.select().from(prescriptions).where(eq(prescriptions.id, id));
    return r ?? null;
  });
  if (rx) await audit({ actor: { id: user.id, role: user.role }, action: "record.view", entityType: "prescription", entityId: rx.id, patientId: rx.patientId });
  return rx;
}

export async function renderPrescriptionPdf(rx: typeof prescriptions.$inferSelect, timeZone: string) {
  const snap = rx.snapshot as unknown as RxSnapshot;
  let signatureImage: Buffer | null = null;
  if (snap.doctor.signatureDocumentId) {
    const db = await getDb();
    const [d] = await db.select().from(documents).where(eq(documents.id, snap.doctor.signatureDocumentId));
    if (d) signatureImage = await readFile(d.storageKey).catch(() => null);
  }
  return prescriptionPdf(snap, { verifyUrl: verifyUrl(rx.number, rx.signature), signature: rx.signature, status: rx.status, signatureImage, timeZone });
}

/** Public check used by pharmacists scanning the QR code. */
export async function verifyPrescriptionNumber(number: string, sigPrefix: string | null) {
  const db = await getDb();
  const [rx] = await db.select().from(prescriptions).where(eq(prescriptions.number, number.toUpperCase()));
  if (!rx) return { found: false as const };
  const snap = rx.snapshot as unknown as RxSnapshot;
  const authentic = verifyRx(snap, rx.signature);
  const full = Boolean(sigPrefix && rx.signature.startsWith(sigPrefix));
  if (full) await db.update(prescriptions).set({ verifyCount: sql`${prescriptions.verifyCount} + 1` }).where(eq(prescriptions.id, rx.id));
  return { found: true as const, authentic, full, status: rx.status, snapshot: snap, issuedAt: rx.issuedAt, verifyCount: rx.verifyCount };
}

export async function prescriptionsForPatients(user: SessionUser, patientIds: string[]) {
  if (!patientIds.length) return [];
  return withRls({ userId: user.id, role: user.role }, (tx) => tx.select().from(prescriptions).where(and(inArray(prescriptions.patientId, patientIds))).orderBy(sql`${prescriptions.issuedAt} desc`));
}
