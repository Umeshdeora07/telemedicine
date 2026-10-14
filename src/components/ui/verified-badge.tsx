import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({ label, title, className }: { label: string; title?: string; className?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-sm font-semibold text-primary-soft-fg", className)}>
      <BadgeCheck className="size-4" aria-hidden />
      {label}
    </span>
  );
}
