import type { NextConfig } from "next";

// Content Security Policy. Video calls use WebRTC (peer-to-peer, DTLS-SRTP
// encrypted); payment gateways load their own checkout scripts.
const csp = [
  "default-src 'self'",
  // 'unsafe-eval' is only needed by React's development tooling.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.razorpay.com https://api.stripe.com",
  "media-src 'self' blob:",
  "frame-src https://api.razorpay.com https://checkout.razorpay.com https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com https://appleid.apple.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(self), display-capture=(self), payment=(self), interest-cohort=()",
  },
  // Not plain same-origin: Razorpay opens bank and UPI steps in a pop-up and
  // needs the link back to it.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

// Server Actions only accept requests from the app's own host. Behind a proxy
// that forwards its own host instead (GitHub Codespaces, some tunnels), list
// the address people open in ALLOWED_ORIGINS (comma-separated host[:port]).
// Inside a Codespace the forwarded address is added automatically.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (process.env.CODESPACE_NAME) {
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || "app.github.dev";
  allowedOrigins.push(`${process.env.CODESPACE_NAME}-${process.env.PORT || 3000}.${domain}`);
}

// Pages removed in the redesign. Temporary (307) so they can come back later
// without browsers having cached a permanent redirect. ":x*" also matches the
// bare path (for example /hospitals as well as /hospitals/some-slug).
const removedPages: { source: string; destination: string }[] = [
  { source: "/international", destination: "/treatment-in-india" },
  { source: "/hospitals/:slug*", destination: "/treatment-in-india" },
  { source: "/emergency", destination: "/help" },
  { source: "/triage", destination: "/doctors" },
  { source: "/health-library/:slug*", destination: "/" },
  { source: "/conditions/:slug*", destination: "/doctors" },
  { source: "/pricing", destination: "/online-consultation" },
  { source: "/how-it-works", destination: "/online-consultation" },
  { source: "/for-clinics", destination: "/contact" },
  { source: "/consult-now", destination: "/doctors" },
  { source: "/specialties/psychiatry", destination: "/specialties/psychology" },
  { source: "/specialties/:slug(paediatrics|pediatrics|gynaecology|gynecology|cardiology|ent|endocrinology)", destination: "/doctors" },
  // Patient portal
  { source: "/health/:path*", destination: "/dashboard" },
  { source: "/reminders", destination: "/dashboard" },
  { source: "/plans", destination: "/dashboard" },
  { source: "/saved", destination: "/dashboard" },
  { source: "/emergency-card", destination: "/dashboard" },
  { source: "/second-opinion/:id*", destination: "/dashboard" },
  { source: "/e/:token", destination: "/" },
  // Staff portals
  { source: "/doctor/second-opinions/:path*", destination: "/doctor" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Same hosts for the development server's own assets (hostnames only).
  allowedDevOrigins: allowedOrigins.length ? allowedOrigins.map((h) => h.replace(/:\d+$/, "")) : undefined,
  // Migrations are read from disk when the database starts, which can happen
  // on any route: ship them with every server function (Vercel, standalone).
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*"],
  },
  // Native/WASM packages that must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "postgres", "web-push", "pdf-lib", "qrcode"],
  // Some containers and network drives drop file-change events; set NEXT_WATCH_POLL_MS=1000 there.
  watchOptions: process.env.NEXT_WATCH_POLL_MS ? { pollIntervalMs: Number(process.env.NEXT_WATCH_POLL_MS) } : undefined,
  images: {
    // Site photos (src/config/images.ts) come from Pexels, always in this URL form.
    remotePatterns: [{ protocol: "https", hostname: "images.pexels.com", port: "", pathname: "/photos/**", search: "?auto=compress&cs=tinysrgb&w=1600" }],
    // Photos do not change, so optimised copies are kept for 31 days.
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },
  async redirects() {
    return removedPages.map((r) => ({ ...r, permanent: false }));
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      // Reports and photos are uploaded through route handlers; actions stay small.
      bodySizeLimit: "2mb",
      allowedOrigins: allowedOrigins.length ? allowedOrigins : undefined,
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
