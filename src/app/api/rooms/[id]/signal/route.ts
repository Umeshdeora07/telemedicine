import { NextResponse, type NextRequest } from "next/server";
import { roomGuard } from "@/server/room-guard";
import { sendSignal } from "@/server/room";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { from: string; to: string; kind: string; payload: unknown };
  const g = await roomGuard(id, body.from);
  if ("error" in g) return g.error;
  if (JSON.stringify(body.payload ?? {}).length > 64_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  const ok = await sendSignal(id, body.from, body.to, body.kind, body.payload);
  return NextResponse.json({ ok });
}
