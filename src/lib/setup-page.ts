/**
 * A small self-contained HTML page for setup problems and the /status
 * checklist. Plain HTML so it works even when the app itself can't start.
 */
import { brand } from "@/config/brand";

export type StatusRow = { label: string; state: "ok" | "problem" | "info"; detail: string; steps?: string[] };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const ICON = { ok: "✓", problem: "✗", info: "•" } as const;

export function statusPage(opts: { heading: string; intro: string; rows: StatusRow[]; footer?: string }) {
  const rows = opts.rows
    .map(
      (r) => `<li class="row ${r.state}">
  <span class="mark" aria-hidden="true">${ICON[r.state]}</span>
  <div><p class="label">${esc(r.label)}<span class="sr"> — ${r.state === "ok" ? "OK" : r.state === "problem" ? "needs fixing" : "note"}</span></p>
  <p class="detail">${esc(r.detail)}</p>
  ${r.steps?.length ? `<ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}</div>
</li>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(opts.heading)} · ${esc(brand.name)}</title>
<style>
:root{--bg:#f3f6f8;--card:#fff;--ink:#0b2545;--text:#1e293b;--muted:#526178;--line:#dbe3ea;--ok:#15803d;--bad:#b91c1c;--teal:#0f766e}
@media (prefers-color-scheme:dark){:root{--bg:#0a1220;--card:#111b2e;--ink:#f4f7fb;--text:#dfe6f0;--muted:#9fb0c6;--line:#24324d;--ok:#4ade80;--bad:#f87171;--teal:#2dd4bf}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:720px;margin:0 auto;padding:32px max(16px,env(safe-area-inset-left))}
h1{color:var(--ink);font-size:26px;line-height:1.2;margin:0 0 8px}p{margin:0}.intro{color:var(--muted);margin-bottom:20px}
ul{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.row{display:grid;grid-template-columns:28px 1fr;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px}
.mark{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;font-weight:700;color:#fff;background:var(--muted)}
.ok .mark{background:var(--ok)}.problem .mark{background:var(--bad)}.problem{border-color:var(--bad)}
.label{font-weight:600;color:var(--ink)}.detail{color:var(--muted)}
ol{margin:8px 0 0;padding-left:20px;display:grid;gap:4px}a{color:var(--teal)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
footer{margin-top:20px;color:var(--muted);font-size:14px}
</style></head>
<body><main><h1>${esc(opts.heading)}</h1><p class="intro">${esc(opts.intro)}</p>
<ul>${rows}</ul>
${opts.footer ? `<footer>${opts.footer}</footer>` : ""}
</main></body></html>`;
}
