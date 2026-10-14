/** Older woman on a video consult with a doctor, her son joining from abroad. Decorative. */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 400" className={className} aria-hidden>
      <defs>
        <linearGradient id="hg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#e6f4f2" />
          <stop offset="1" stopColor="#fdf3dc" />
        </linearGradient>
      </defs>
      <circle cx="250" cy="200" r="185" fill="url(#hg)" />
      <circle cx="400" cy="70" r="22" fill="#f59e0b" opacity=".85" />
      <circle cx="80" cy="320" r="12" fill="#0f766e" opacity=".25" />
      {/* phone */}
      <rect x="250" y="70" width="170" height="290" rx="26" fill="#0b2545" />
      <rect x="261" y="86" width="148" height="258" rx="16" fill="#f8fafc" />
      {/* doctor on screen */}
      <rect x="261" y="86" width="148" height="190" rx="16" fill="#d9f2ee" />
      <path d="M290 276c4-34 22-50 45-50s41 16 45 50z" fill="#fff" stroke="#cbd5e1" />
      <path d="M325 228l10 18 10-18z" fill="#0f766e" />
      <ellipse cx="335" cy="190" rx="25" ry="28" fill="#c98e5f" />
      <path d="M309 186c0-20 12-31 26-31s26 11 26 31c-6-9-14-13-26-13s-20 4-26 13z" fill="#1f1a17" />
      <circle cx="326" cy="192" r="2.5" fill="#1f2937" />
      <circle cx="344" cy="192" r="2.5" fill="#1f2937" />
      <path d="M328 203c4 3 10 3 14 0" stroke="#7c4a3a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M312 240c-4 12-2 22 4 28M358 240c4 12 2 22-4 28" stroke="#0b2545" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* small tile: son abroad */}
      <rect x="350" y="96" width="50" height="62" rx="10" fill="#e3ecfb" stroke="#fff" strokeWidth="3" />
      <ellipse cx="375" cy="120" rx="10" ry="11" fill="#e0ac7e" />
      <path d="M364 118c0-8 5-12 11-12s11 4 11 12c-3-4-6-5-11-5s-8 1-11 5z" fill="#2e2420" />
      <path d="M359 158c2-14 8-20 16-20s14 6 16 20z" fill="#0f766e" />
      {/* call controls */}
      <circle cx="300" cy="312" r="15" fill="#e2e8f0" />
      <circle cx="335" cy="312" r="17" fill="#dc2626" />
      <rect x="327" y="309" width="16" height="6" rx="3" fill="#fff" />
      <circle cx="370" cy="312" r="15" fill="#e2e8f0" />
      {/* older woman holding the phone */}
      <path d="M40 400c6-80 50-120 110-120s100 40 108 120z" fill="#b45309" />
      <path d="M78 300c30 40 95 60 160 30l12 70H70z" fill="#f59e0b" opacity=".9" />
      <rect x="130" y="230" width="34" height="40" rx="14" fill="#a8724a" />
      <ellipse cx="147" cy="196" rx="42" ry="47" fill="#a8724a" />
      <path d="M104 196c-2-36 18-56 43-56s45 20 43 56c-6-20-22-32-43-32s-37 12-43 32z" fill="#8d8d8d" />
      <circle cx="187" cy="168" r="14" fill="#8d8d8d" />
      <circle cx="132" cy="200" r="3.2" fill="#1f2937" />
      <circle cx="162" cy="200" r="3.2" fill="#1f2937" />
      <path d="M135 222c7 5 17 5 24 0" stroke="#5b3a2a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="147" cy="183" r="3.5" fill="#dc2626" />
      <rect x="120" y="193" width="24" height="15" rx="7" fill="none" stroke="#475569" strokeWidth="2.5" />
      <rect x="150" y="193" width="24" height="15" rx="7" fill="none" stroke="#475569" strokeWidth="2.5" />
      <path d="M144 200h6" stroke="#475569" strokeWidth="2.5" />
      <path d="M200 330c20-10 40-20 58-26" stroke="#a8724a" strokeWidth="22" strokeLinecap="round" />
      {/* heart + check badge */}
      <g transform="translate(60 90)">
        <rect width="120" height="44" rx="22" fill="#fff" stroke="#e2e8f0" />
        <circle cx="22" cy="22" r="13" fill="#0f766e" />
        <path d="M16 22l4.5 4.5L29 18" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="42" y="14" width="62" height="7" rx="3.5" fill="#cbd5e1" />
        <rect x="42" y="25" width="42" height="6" rx="3" fill="#e2e8f0" />
      </g>
    </svg>
  );
}

export function GlobeIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 180" className={className} aria-hidden>
      <circle cx="110" cy="90" r="78" fill="#e6f4f2" />
      <circle cx="110" cy="90" r="58" fill="#fff" stroke="#0f766e" strokeWidth="3" />
      <path d="M52 90h116M110 32c-20 18-20 98 0 116M110 32c20 18 20 98 0 116" stroke="#0f766e" strokeWidth="2.5" fill="none" />
      <path d="M62 62c30 8 66 8 96 0M62 118c30-8 66-8 96 0" stroke="#0f766e" strokeWidth="2" fill="none" opacity=".6" />
      <path d="M40 40c40-30 100-28 140 6" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 7" fill="none" strokeLinecap="round" />
      <path d="M176 40l6 8-10 1z" fill="#f59e0b" />
      <circle cx="128" cy="98" r="9" fill="#dc2626" />
      <circle cx="128" cy="98" r="3.5" fill="#fff" />
      <circle cx="58" cy="44" r="7" fill="#0b2545" />
    </svg>
  );
}

export function FamilyIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 180" className={className} aria-hidden>
      <rect x="10" y="20" width="200" height="140" rx="24" fill="#fdf3dc" />
      <rect x="28" y="40" width="74" height="96" rx="14" fill="#fff" stroke="#e2e8f0" />
      <ellipse cx="65" cy="78" rx="16" ry="18" fill="#f2c9a5" />
      <path d="M49 76c0-13 7-20 16-20s16 7 16 20c-4-6-9-8-16-8s-12 2-16 8z" fill="#b9b6b0" />
      <path d="M42 136c3-22 11-32 23-32s20 10 23 32z" fill="#0f766e" />
      <rect x="118" y="40" width="74" height="96" rx="14" fill="#fff" stroke="#e2e8f0" />
      <ellipse cx="155" cy="78" rx="16" ry="18" fill="#8a5a3b" />
      <path d="M139 74c0-12 7-18 16-18s16 6 16 18c-4-5-9-7-16-7s-12 2-16 7z" fill="#151515" />
      <path d="M132 136c3-22 11-32 23-32s20 10 23 32z" fill="#0b2545" />
      <path d="M104 88h12" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
      <path d="M110 70c-6-8-18-4-14 6l14 12 14-12c4-10-8-14-14-6z" fill="#dc2626" />
    </svg>
  );
}
