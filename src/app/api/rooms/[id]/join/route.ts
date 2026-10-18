import { NextResponse, type NextRequest } from "next/server";
import { roomGuard, joinWindow } from "@/server/room-guard";
import { iceServers, joinRoom } from "@/server/room";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await roomGuard(id);
  if ("error" in g) return g.error;
  const { access } = g;
  const win = joinWindow(access.appointment, access.role);
  if (!win.ok) return NextResponse.json({ error: win.reason, opensAt: "opensAt" in win ? win.opensAt : undefined }, { status: 409 });
  const peerId = await joinRoom(access);
  return NextResponse.json({ peerId, role: access.role, displayName: access.displayName, iceServers: await iceServers() });
}
