import { NextResponse, type NextRequest } from "next/server";
import { roomGuard } from "@/server/room-guard";
import { leaveRoom } from "@/server/room";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { peer?: string };
  const g = await roomGuard(id, body.peer);
  if ("error" in g) return g.error;
  if (body.peer) await leaveRoom(id, body.peer);
  return NextResponse.json({ ok: true });
}
