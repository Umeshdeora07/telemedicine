import { NextResponse, type NextRequest } from "next/server";
import { roomGuard } from "@/server/room-guard";
import { pollRoom } from "@/server/room";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const peer = req.nextUrl.searchParams.get("peer");
  const g = await roomGuard(id, peer);
  if ("error" in g) return g.error;
  const r = await pollRoom(g.access, peer!, Number(req.nextUrl.searchParams.get("s") ?? 0), Number(req.nextUrl.searchParams.get("m") ?? 0));
  if (!r) return NextResponse.json({ error: "rejoin" }, { status: 409 });
  return NextResponse.json(r, { headers: { "Cache-Control": "no-store" } });
}
