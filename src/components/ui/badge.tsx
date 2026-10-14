import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-surface-2 text-fg-muted border-line",
  primary: "bg-primary-soft text-primary-soft-fg border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  accent: "bg-accent text-on-accent border-transparent",
} as const;

export function Badge({ tone = "neutral", className, ...rest }: ComponentProps<"span"> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-medium leading-6", tones[tone], className)}
      {...rest}
    />
  );
}
