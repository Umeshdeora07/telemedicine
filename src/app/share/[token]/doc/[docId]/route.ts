import { NextResponse, type NextRequest } from "next/server";
import { openShareLink } from "@/server/patient-app";
import { readFileIfPresent } from "@/lib/storage";
import { audit } from "@/server/audit";

/** Download one document from a share link (only documents included in that link). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string; docId: string }> }) {
  const { token, docId } = await ctx.params;
  const s = await openShareLink(token, { count: false });
  const doc = s?.docs.find((d) => d.id === docId);
  if (!s || !doc) return new NextResponse("Not found", { status: 404 });
  await audit({ actor: null, action: "share_link.download", entityType: "document", entityId: doc.id, patientId: s.link.patientId, metadata: { shareLinkId: s.link.id } });
  const data = await readFileIfPresent(doc.storageKey);
  if (!data) return new NextResponse("This file is no longer stored on the server. Please upload it again.", { status: 410, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": doc.mimeType, "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" },
  });
}
