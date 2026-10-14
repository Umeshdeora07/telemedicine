import { NextResponse, type NextRequest } from "next/server";
import { roomGuard } from "@/server/room-guard";
import { setRecordingConsent } from "@/server/room";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await roomGuard(id);
  if ("error" in g) return g.error;
  if (g.access.role === "interpreter") return NextResponse.json({ error: "Only the doctor and the patient side decide on recording." }, { status: 403 });
  const { agree } = (await req.json()) as { agree: boolean };
  const r = await setRecordingConsent(g.access, Boolean(agree));
  return NextResponse.json(r);
}
