import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  info: { cls: "bg-primary-soft border-primary/30 text-fg", Icon: Info, icon: "text-primary" },
  success: { cls: "bg-success-soft border-success/30 text-fg", Icon: CheckCircle2, icon: "text-success" },
  warning: { cls: "bg-warning-soft border-warning/40 text-fg", Icon: AlertTriangle, icon: "text-warning" },
  danger: { cls: "bg-danger-soft border-danger/40 text-fg", Icon: OctagonAlert, icon: "text-danger" },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
  role,
}: {
  tone?: keyof typeof tones;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  const t = tones[tone];
  return (
    <div role={role ?? (tone === "danger" ? "alert" : "status")} className={cn("flex gap-3 rounded-xl border p-4", t.cls, className)}>
      <t.Icon className={cn("mt-0.5 size-5 shrink-0", t.icon)} aria-hidden />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold text-heading">{title}</p> : null}
        {children ? <div className="text-[0.9375rem] text-fg">{children}</div> : null}
      </div>
    </div>
  );
}
