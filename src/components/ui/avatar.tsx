import { cn, initials } from "@/lib/utils";

const BG = ["#d9f2ee", "#e3ecfb", "#fdecc8", "#f6e1ea", "#e5f3dd", "#ece6fa", "#fde4d5", "#dff3f7"];
const SKIN = ["#f2c9a5", "#e0ac7e", "#c98e5f", "#a8724a", "#8a5a3b", "#6b4430", "#f5d0b5", "#d49a6a"];
const HAIR = ["#1f1a17", "#2e2420", "#3b2a20", "#151515", "#5b4636", "#262019", "#33261d", "#1b1410"];
const GREY = "#9a9894";

/**
 * Illustrated avatar for demo doctors, or the uploaded professional photo.
 * Deterministic from `seed`, so the same doctor always looks the same.
 */
export function DoctorAvatar({
  name,
  seed,
  gender,
  photoUrl,
  size = 56,
  className,
  senior,
}: {
  name: string;
  seed: number;
  gender: "female" | "male" | "other";
  photoUrl?: string | null;
  size?: number;
  className?: string;
  senior?: boolean;
}) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt="" width={size} height={size} className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  const bg = BG[seed % BG.length]!;
  const skin = SKIN[(seed * 3) % SKIN.length]!;
  const hair = senior ? GREY : HAIR[(seed * 5) % HAIR.length]!;
  const female = gender === "female";
  const style = seed % 3;
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} className={cn("shrink-0 rounded-full", className)} aria-hidden>
      <circle cx="48" cy="48" r="48" fill={bg} />
      {female && style !== 1 ? <path d="M27 46c0-19 9-30 21-30s21 11 21 30v20c0 5-4 8-9 8H36c-5 0-9-3-9-8z" fill={hair} /> : null}
      <path d="M14 96c2-18 15-28 34-28s32 10 34 28z" fill="#ffffff" stroke="#d6dee8" />
      <path d="M38 69l10 14 10-14z" fill="#0f766e" />
      <path d="M33 70c-3 8-2 15 3 19M63 70c3 8 2 15-3 19" stroke="#0b2545" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="58" cy="89" r="3" fill="#0b2545" />
      <rect x="41" y="54" width="14" height="16" rx="6" fill={skin} />
      <ellipse cx="48" cy="42" rx="17" ry="19" fill={skin} />
      {female ? (
        style === 1 ? (
          <>
            <path d="M31 40c0-13 8-21 17-21s17 8 17 21c-4-6-10-9-17-9s-13 3-17 9z" fill={hair} />
            <circle cx="48" cy="18" r="7" fill={hair} />
          </>
        ) : (
          <path d="M30 44c0-15 8-24 18-24s18 9 18 24c-2-7-8-13-18-13s-16 6-18 13z" fill={hair} />
        )
      ) : style === 2 ? (
        <path d="M31 38c1-12 8-18 17-18s16 6 17 18c-3-4-9-7-17-7s-14 3-17 7z" fill={hair} />
      ) : (
        <path d="M31 40c0-13 8-20 17-20s17 7 17 20l-3-6c-4-3-9-4-14-4s-10 1-14 4z" fill={hair} />
      )}
      <circle cx="41.5" cy="44" r="1.8" fill="#1f2937" />
      <circle cx="54.5" cy="44" r="1.8" fill="#1f2937" />
      <path d="M43 51.5c3 2.4 7 2.4 10 0" stroke="#7c4a3a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function InitialsAvatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn("inline-grid shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary-soft-fg", className)}
    >
      {initials(name)}
    </span>
  );
}
