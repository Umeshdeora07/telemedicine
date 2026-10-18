import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { doctors, documents } from "@/db/schema";
import { getSession } from "@/server/auth/session";
import { readFileIfPresent } from "@/lib/storage";

/**
 * A doctor's profile photo. Public once the doctor is approved; before that
 * only the doctor and admins can see it (for the verification review).
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Not found", { status: 404 });
  const db = await getDb();
  const [row] = await db
    .select({ doc: documents, doctor: { userId: doctors.userId, status: doctors.verificationStatus, photoUrl: doctors.photoUrl } })
    .from(documents)
    .innerJoin(doctors, eq(doctors.id, documents.doctorId))
    .where(and(eq(documents.id, id), eq(documents.category, "photo"), isNull(documents.deletedAt)));
  if (!row || !row.doc.mimeType.startsWith("image/")) return new NextResponse("Not found", { status: 404 });
  const isPublic = row.doctor.status === "approved" && row.doctor.photoUrl === `/api/doctor-photos/${id}`;
  if (!isPublic) {
    const session = await getSession();
    if (!session || (session.user.id !== row.doctor.userId && session.user.role !== "super_admin")) return new NextResponse("Not found", { status: 404 });
  }
  const data = await readFileIfPresent(row.doc.storageKey);
  if (!data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": row.doc.mimeType,
      "Content-Length": String(data.length),
      "Cache-Control": isPublic ? "public, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
