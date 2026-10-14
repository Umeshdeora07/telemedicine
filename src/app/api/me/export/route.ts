import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { exportMyData } from "@/server/patient-app";
import { brand } from "@/config/brand";

/** Download everything we hold about you (DPDP / GDPR right of access). */
export async function GET() {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorised", { status: 401 });
  const data = await exportMyData(session.user);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${brand.name.toLowerCase()}-my-data-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "private, no-store" },
  });
}
