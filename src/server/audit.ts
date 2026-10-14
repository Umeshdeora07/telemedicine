import "server-only";
import { headers } from "next/headers";
import { getDb, type Executor } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditInput = {
  actor?: { id: string; role: string } | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  patientId?: string | null;
  metadata?: Record<string, unknown>;
};

/** Append-only audit trail: who viewed or changed what, and when. */
export async function audit(input: AuditInput, db?: Executor) {
  let ip: string | null = null;
  let ua: string | null = null;
  try {
    const h = await headers();
    ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim() || null;
    ua = h.get("user-agent")?.slice(0, 300) ?? null;
  } catch {
    /* outside a request (scheduler) */
  }
  const exec = db ?? (await getDb());
  await exec.insert(auditLogs).values({
    actorUserId: input.actor?.id ?? null,
    actorRole: input.actor?.role ?? "system",
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    patientId: input.patientId ?? null,
    ip,
    userAgent: ua,
    metadata: input.metadata ?? {},
  });
}
