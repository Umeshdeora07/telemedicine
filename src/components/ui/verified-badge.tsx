import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small "Registration verified" style badge. `title` can carry the date of the last check. */
export function VerifiedBadge({ label, title, className }: { label: string; title?: string; className?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-sm font-semibold text-success", className)}>
      <BadgeCheck className="size-4 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
