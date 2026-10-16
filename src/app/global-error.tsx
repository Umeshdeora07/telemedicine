"use client";

/**
 * Shown when the whole app fails to render (for example the database can't be
 * reached). Plain markup: the root layout, fonts and translations may be what failed.
 */
// A full reload fetches the page again from the server (the error usually came
// from there) and works even if the app's router is what failed.
export default function GlobalError(_: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", background: "#f3f6f8", color: "#1e293b" }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 16px", lineHeight: 1.55 }}>
          <h1 style={{ color: "#0b2545", fontSize: 26, margin: "0 0 8px" }}>The site couldn&apos;t load this page</h1>
          <p style={{ margin: "0 0 16px" }}>Please try again in a moment. If you run this site, the status page says what needs fixing.</p>
          <p style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: 0 }}>
            <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, padding: "0 18px", borderRadius: 12, border: 0, background: "#0f766e", color: "#fff", fontWeight: 600, fontSize: 16 }}>
              Try again
            </button>
            {/* A plain link: the app's router may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/status" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", padding: "0 18px", borderRadius: 12, border: "1px solid #dbe3ea", color: "#0b2545", fontWeight: 600, textDecoration: "none", background: "#fff" }}>
              Open the status page
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
