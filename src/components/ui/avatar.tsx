import { UserRound } from "lucide-react";
import { cn, initials } from "@/lib/utils";

/**
 * A doctor's picture: their own uploaded photo when there is one, otherwise a
 * plain initials circle. The doctor's name is always shown next to it, so the
 * picture is decorative for screen readers.
 *
 * `seed`, `gender` and `senior` are accepted for older callers and are not used.
 */
export function DoctorAvatar({
  name,
  photoUrl,
  size = 56,
  className,
}: {
  name: string;
  seed?: number;
  gender?: "female" | "male" | "other";
  photoUrl?: string | null;
  size?: number;
  className?: string;
  senior?: boolean;
}) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt="" width={size} height={size} loading="lazy" className={cn("shrink-0 rounded-full border border-line bg-surface-2 object-cover", className)} style={{ width: size, height: size }} />;
  }
  return <InitialsAvatar name={name} size={size} className={cn("ring-1 ring-inset ring-primary/15", className)} />;
}

export function InitialsAvatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={cn("inline-grid shrink-0 select-none place-items-center rounded-full bg-primary-soft font-heading font-bold tracking-wide text-primary-soft-fg", className)}
    >
      {initials(name) || <UserRound className="size-[55%]" aria-hidden />}
    </span>
  );
}
