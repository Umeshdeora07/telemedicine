import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import { getSession } from "@/server/auth/session";
import { canUpload, type DocCategory } from "@/server/documents";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, saveFile, sniffMime } from "@/lib/storage";
import { audit } from "@/server/audit";

/** Upload a report, scan, photo or certificate. Stored encrypted. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "This file is larger than 15 MB. Please upload a smaller file or a photo of each page." }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf, file.type);
  if (!mime || !ALLOWED_UPLOAD_TYPES[mime]) return NextResponse.json({ error: "Please upload a PDF or a photo (JPG, PNG, WebP or HEIC)." }, { status: 415 });
  const category = (String(form.get("category") || "report") as DocCategory);
  const target = {
    patientId: (form.get("patientId") as string) || null,
    appointmentId: (form.get("appointmentId") as string) || null,
    caseId: (form.get("caseId") as string) || null,
    category,
    forDoctor: form.get("forDoctor") === "1",
  };
  const db = await getDb();
  const allowed = await canUpload(db, session.user, target);
  if (!allowed.ok) return NextResponse.json({ error: "You can't add files here." }, { status: 403 });
  const saved = await saveFile(buf);
  const title = String(form.get("title") || file.name || "Document").slice(0, 120);
  const [doc] = await db
    .insert(documents)
    .values({
      patientId: "patientId" in allowed ? allowed.patientId : null,
      doctorId: "doctorId" in allowed ? allowed.doctorId : null,
      appointmentId: target.appointmentId,
      caseId: target.caseId,
      uploadedByUserId: session.user.id,
      category,
      title,
      fileName: file.name.slice(0, 160) || `upload.${ALLOWED_UPLOAD_TYPES[mime]}`,
      mimeType: mime,
      sizeBytes: saved.sizeBytes,
      storageKey: saved.storageKey,
      sha256: saved.sha256,
      reportDate: (form.get("reportDate") as string) || null,
    })
    .returning();
  await audit({ actor: { id: session.user.id, role: session.user.role }, action: "record.upload", entityType: "document", entityId: doc!.id, patientId: doc!.patientId, metadata: { category } });
  return NextResponse.json({ id: doc!.id, title: doc!.title, mimeType: doc!.mimeType, sizeBytes: doc!.sizeBytes });
}
