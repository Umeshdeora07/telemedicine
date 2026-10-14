import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import { roomGuard } from "@/server/room-guard";
import { postRoomMessage } from "@/server/room";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await roomGuard(id);
  if ("error" in g) return g.error;
  const { access } = g;
  const a = access.appointment;
  // Chat is open during the consult and, afterwards, for the free follow-up window.
  const open = ["confirmed", "in_progress"].includes(a.status) || (a.status === "completed" && a.followUpChatUntil && a.followUpChatUntil > new Date());
  if (!open) return NextResponse.json({ error: "The chat for this consult is closed." }, { status: 409 });
  const body = (await req.json()) as { body?: string; documentId?: string };
  let documentId: string | null = null;
  if (body.documentId) {
    const db = await getDb();
    const [d] = await db.select().from(documents).where(and(eq(documents.id, body.documentId), eq(documents.appointmentId, a.id)));
    documentId = d?.id ?? null;
  }
  const text = (body.body ?? "").trim();
  if (!text && !documentId) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  const m = await postRoomMessage(access, text, documentId, documentId ? "file" : "text");
  return NextResponse.json({ id: m.id });
}
