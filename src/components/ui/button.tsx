import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent" | "link";
export type ButtonSize = "md" | "lg" | "sm" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[background,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 select-none text-center whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover shadow-sm",
  secondary: "bg-primary-soft text-primary-soft-fg hover:bg-[color-mix(in_oklab,var(--primary-soft),var(--primary)_12%)]",
  outline: "border border-field bg-surface text-fg hover:bg-surface-2",
  ghost: "text-fg hover:bg-surface-2",
  danger: "bg-danger-solid text-on-danger hover:brightness-95 shadow-sm",
  accent: "bg-accent text-on-accent hover:brightness-95",
  link: "text-primary underline-offset-4 hover:underline px-0 min-h-0",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3.5 text-sm",
  md: "min-h-11 px-5 text-base",
  lg: "min-h-13 px-6 text-lg",
  icon: "size-11 p-0",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], variant === "link" ? "" : sizes[size], className);
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; className?: string; children: ReactNode };

export function Button({ variant, size, className, children, type = "button", ...rest }: Common & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, children, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link data-button className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
