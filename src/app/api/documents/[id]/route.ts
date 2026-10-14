import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import { getDocumentForUser, softDeleteDocument } from "@/server/documents";
import { readFile } from "@/lib/storage";

/** Download a document the signed-in user may see (row-level security + audit log). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorised", { status: 401 });
  const { id } = await ctx.params;
  const doc = await getDocumentForUser(session.user, id);
  if (!doc) return new NextResponse("Not found", { status: 404 });
  const data = await readFile(doc.storageKey);
  const inline = req.nextUrl.searchParams.get("download") !== "1";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(doc.fileName)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorised", { status: 401 });
  const { id } = await ctx.params;
  const ok = await softDeleteDocument(session.user, id);
  return ok ? NextResponse.json({ ok: true }) : new NextResponse("Not allowed", { status: 403 });
}
