import { cn } from "@/lib/utils";

export function Stepper({ current, total, label, steps }: { current: number; total: number; label: string; steps?: string[] }) {
  return (
    <div className="space-y-2" aria-label={label}>
      <p className="text-sm font-semibold text-primary">{label}</p>
      <ol className="flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <li key={i} className={cn("h-1.5 flex-1 rounded-full", i < current ? "bg-primary" : "bg-line")} title={steps?.[i]} />
        ))}
      </ol>
    </div>
  );
}
