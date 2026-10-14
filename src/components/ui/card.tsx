import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("card p-5", className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: ComponentProps<"h2">) {
  return <h2 className={cn("text-lg font-bold", className)} {...rest} />;
}

export function Section({ className, ...rest }: ComponentProps<"section">) {
  return <section className={cn("py-10 sm:py-14", className)} {...rest} />;
}
