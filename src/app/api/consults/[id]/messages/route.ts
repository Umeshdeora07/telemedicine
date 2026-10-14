import { NextResponse, type NextRequest } from "next/server";
import { and, asc, eq, gt } from "drizzle-orm";
import { withRls } from "@/db";
import { messages } from "@/db/schema";
import { getSession } from "@/server/auth/session";

/** Follow-up chat messages for a consult (row-level security decides access). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorised", { status: 401 });
  const { id } = await ctx.params;
  const since = Number(req.nextUrl.searchParams.get("since") ?? 0);
  const rows = await withRls({ userId: session.user.id, role: session.user.role }, (tx) =>
    tx.select().from(messages).where(and(eq(messages.appointmentId, id), gt(messages.id, since))).orderBy(asc(messages.id)).limit(200),
  );
  return NextResponse.json({
    messages: rows.map((m) => ({ id: m.id, senderRole: m.senderRole, senderName: m.senderName, body: m.body, documentId: m.documentId, kind: m.kind, createdAt: m.createdAt.toISOString(), mine: m.senderUserId === session.user.id })),
  });
}
