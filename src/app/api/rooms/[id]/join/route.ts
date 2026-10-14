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
  // The patient's side must confirm where the patient is, shortly before every consult.
  const confirmed = access.appointment.locationConfirmedAt;
  if ((access.role === "patient" || access.role === "caregiver") && (!confirmed || confirmed.getTime() < Date.now() - 2 * 3600_000)) {
    return NextResponse.json({ error: "confirm_location" }, { status: 409 });
  }
  const peerId = await joinRoom(access);
  return NextResponse.json({ peerId, role: access.role, displayName: access.displayName, iceServers: await iceServers() });
}
