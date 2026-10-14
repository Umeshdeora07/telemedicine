"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import * as admin from "@/server/admin";
import { CURRENCY_CODES } from "@/config/currencies";

export type AdminState = { ok?: boolean; error?: string };

async function run(fn: (u: Awaited<ReturnType<typeof requireUser>>) => Promise<unknown>, paths: string[]): Promise<AdminState> {
  const t = await getT();
  const user = await requireUser({ roles: ["super_admin"] });
  try {
    await fn(user);
    for (const p of paths) revalidatePath(p);
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { error: t("Please check the form and try again.") };
    if (e instanceof Error) return { error: t(e.message) };
    throw e;
  }
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function verifyLicenceAction(_p: AdminState, f: FormData): Promise<AdminState> {
  const doctorId = str(f, "doctorId");
  return run(
    (u) =>
      admin.verifyLicence(u, z.string().uuid().parse(str(f, "licenceId")), {
        status: z.enum(["verified", "rejected", "suspended"]).parse(str(f, "status")),
        reference: z.string().min(3, "Enter the council register reference you checked.").max(200).parse(str(f, "reference")),
        notes: str(f, "notes").slice(0, 1000),
        evidenceDocumentId: str(f, "evidenceDocumentId") || null,
      }),
    [`/admin/verification/${doctorId}`, "/admin/verification"],
  );
}

export async function decideDoctorAction(_p: AdminState, f: FormData): Promise<AdminState> {
  const id = str(f, "doctorId");
  return run((u) => admin.decideDoctor(u, z.string().uuid().parse(id), z.enum(["approve", "reject", "suspend", "reinstate"]).parse(str(f, "decision")), str(f, "reason").slice(0, 1000)), [`/admin/verification/${id}`, "/admin/verification", "/doctors"]);
}

export async function decideClinicAction(id: string, approve: boolean) {
  return run((u) => admin.decideClinic(u, z.string().uuid().parse(id), approve), ["/admin/verification"]);
}

export async function setUserStatusAction(id: string, status: "active" | "suspended") {
  return run((u) => admin.setUserStatus(u, z.string().uuid().parse(id), status), ["/admin/users"]);
}

export async function refundAction(_p: AdminState, f: FormData): Promise<AdminState> {
  return run((u) => admin.adminRefund(u, z.string().uuid().parse(str(f, "paymentId")), Math.round(Number(str(f, "amount")) * 100), str(f, "reason")), ["/admin/payments"]);
}

export async function complaintAction(_p: AdminState, f: FormData): Promise<AdminState> {
  return run(
    (u) =>
      admin.updateComplaint(u, z.string().uuid().parse(str(f, "id")), {
        status: z.enum(["acknowledged", "in_progress", "resolved", "closed"]).parse(str(f, "status")),
        note: z.string().min(3).max(2000).parse(str(f, "note")),
        public: f.get("public") === "on",
        resolution: str(f, "resolution") || undefined,
      }),
    ["/admin/complaints"],
  );
}

export async function countryAction(code: string, patch: { enabled?: boolean; localConsultsEnabled?: boolean }) {
  return run((u) => admin.setCountry(u, z.string().regex(/^[A-Z]{2}$/).parse(code), patch), ["/admin/settings"]);
}

export async function emergencyAction(_p: AdminState, f: FormData): Promise<AdminState> {
  const code = str(f, "code");
  const num = (k: string) => str(f, k).replace(/[^\d+]/g, "").slice(0, 15);
  return run((u) => admin.setCountry(u, code, { emergency: { general: num("general"), ambulance: num("ambulance") || undefined, police: num("police") || undefined, crisisLine: num("crisisLine") || undefined, crisisLineName: str(f, "crisisLineName").slice(0, 80) || undefined } }), ["/admin/settings", "/emergency"]);
}

export async function rateAction(_p: AdminState, f: FormData): Promise<AdminState> {
  return run((u) => admin.addRate(u, z.enum(CURRENCY_CODES.filter((c) => c !== "INR") as [string, ...string[]]).parse(str(f, "quote")), z.number().positive().max(10000).parse(Number(str(f, "rate")))), ["/admin/settings"]);
}

export async function policyAction(_p: AdminState, f: FormData): Promise<AdminState> {
  const n = (k: string) => z.number().int().min(0).max(1000).parse(Number(str(f, k)));
  return run((u) => admin.setSetting(u, "refund_policy", { doctorNoShowMinutes: n("doctorNoShowMinutes"), patientCancelFullRefundHours: n("patientCancelFullRefundHours"), patientCancelPartialRefundPercent: n("patientCancelPartialRefundPercent"), rescheduleFreeHours: n("rescheduleFreeHours") }), ["/admin/settings"]);
}

export async function couponAction(_p: AdminState, f: FormData): Promise<AdminState> {
  return run(async (u) => {
    const kind = z.enum(["percent", "flat"]).parse(str(f, "kind"));
    const value = Number(str(f, "value"));
    await admin.createCoupon(u, {
      code: z.string().regex(/^[A-Za-z0-9]{3,20}$/).parse(str(f, "code")),
      description: str(f, "description").slice(0, 200),
      kind,
      value: kind === "percent" ? z.number().int().min(1).max(100).parse(value) : Math.round(z.number().positive().parse(value) * 100),
      maxDiscountMinor: str(f, "maxDiscount") ? Math.round(Number(str(f, "maxDiscount")) * 100) : null,
      maxUses: str(f, "maxUses") ? Number(str(f, "maxUses")) : null,
      validUntil: str(f, "validUntil") ? new Date(str(f, "validUntil")) : null,
      firstConsultOnly: f.get("firstConsultOnly") === "on",
    });
  }, ["/admin/settings"]);
}

export async function toggleCouponAction(id: string, active: boolean) {
  return run((u) => admin.toggleCoupon(u, id, active), ["/admin/settings"]);
}

export async function dataRequestAction(id: string, status: "completed" | "rejected", note: string) {
  return run((u) => admin.closeDataRequest(u, id, status, note), ["/admin/compliance"]);
}

export async function incidentAction(_p: AdminState, f: FormData): Promise<AdminState> {
  return run(
    (u) => admin.logIncident(u, { title: z.string().min(3).max(200).parse(str(f, "title")), description: z.string().min(5).max(4000).parse(str(f, "description")), severity: z.enum(["low", "medium", "high", "critical"]).parse(str(f, "severity")), affectedUsers: Number(str(f, "affectedUsers")) || 0 }),
    ["/admin/compliance"],
  );
}

export async function incidentStepAction(id: string, field: "containedAt" | "reportedToBoardAt" | "usersNotifiedAt" | "closed") {
  return run((u) => admin.updateIncident(u, id, field), ["/admin/compliance"]);
}

export async function saveArticleAction(_p: AdminState, f: FormData): Promise<AdminState> {
  return run(
    (u) =>
      admin.saveArticle(u, {
        id: str(f, "id") || undefined,
        title: z.string().min(5).max(160).parse(str(f, "title")),
        summary: z.string().min(10).max(400).parse(str(f, "summary")),
        body: z.string().min(50).max(40000).parse(str(f, "body")),
        category: z.string().min(2).max(40).parse(str(f, "category")),
        language: z.string().min(2).max(5).parse(str(f, "language") || "en"),
        reviewedByDoctorId: str(f, "reviewer") || null,
        readMinutes: Math.max(1, Math.round(str(f, "body").split(/\s+/).length / 200)),
        publish: f.get("publish") === "on",
      }),
    ["/admin/content", "/health-library"],
  );
}

export async function publishArticleAction(id: string, publish: boolean) {
  return run((u) => admin.setArticlePublished(u, id, publish), ["/admin/content", "/health-library"]);
}
