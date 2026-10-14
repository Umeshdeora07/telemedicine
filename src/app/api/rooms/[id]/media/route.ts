import { NextResponse, type NextRequest } from "next/server";
import { roomGuard } from "@/server/room-guard";
import { updateMedia } from "@/server/room";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { peer: string; media: { audio: boolean; video: boolean; screen?: boolean; lowBandwidth?: boolean } };
  const g = await roomGuard(id, body.peer);
  if ("error" in g) return g.error;
  await updateMedia(id, body.peer, { audio: Boolean(body.media.audio), video: Boolean(body.media.video), screen: Boolean(body.media.screen), lowBandwidth: Boolean(body.media.lowBandwidth) });
  return NextResponse.json({ ok: true });
}
