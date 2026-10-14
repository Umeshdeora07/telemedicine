import Link from "next/link";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect width="40" height="40" rx="12" fill="#0F766E" />
      <path d="M20 30s-9-5.6-9-12.2A5.3 5.3 0 0 1 20 14a5.3 5.3 0 0 1 9 3.8C29 24.4 20 30 20 30z" fill="#fff" />
      <path d="M14.5 21h3.2l1.6-3 2.4 6 1.6-3h2.2" stroke="#0F766E" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="31" cy="9" r="3.2" fill="#F59E0B" />
    </svg>
  );
}

export function Logo({ href = "/", className, light }: { href?: string; className?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 rounded-lg", className)} aria-label={`${brand.name} home`}>
      <LogoMark />
      <span className={cn("font-heading text-xl font-extrabold tracking-tight", light ? "text-on-navy" : "text-heading")}>{brand.name}</span>
    </Link>
  );
}
