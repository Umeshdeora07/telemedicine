import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, children, action, className }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("card flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      {icon ? <div className="grid size-14 place-items-center rounded-full bg-primary-soft text-primary">{icon}</div> : null}
      <h3 className="text-lg font-bold">{title}</h3>
      {children ? <div className="max-w-md text-fg-muted">{children}</div> : null}
      {action}
    </div>
  );
}
