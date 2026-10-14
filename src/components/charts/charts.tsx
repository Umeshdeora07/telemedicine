"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";

/*
 * Small, dependency-free charts for the admin dashboard.
 * Specs: bars <= 24px with a 4px rounded data-end and a square baseline,
 * 2px surface gap between stacked segments, hairline recessive grid,
 * one y-axis, legend for 2+ series, hover/focus tooltip, table view.
 * Colours come from validated --series-* tokens (light and dark).
 */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.floor(e!.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Clean integer ticks: steps of 1, 2 or 5 × 10^k, at most 5 intervals. */
function niceTicks(v: number) {
  const target = Math.max(1, v) / 4;
  const pow = 10 ** Math.floor(Math.log10(target));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= target) ?? 10 * pow);
  const max = Math.max(step, Math.ceil(Math.max(1, v) / step) * step);
  return { max, ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step) };
}

function compact(n: number, intl: string) {
  return new Intl.NumberFormat(intl, { notation: n >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}

/** Column with a 4px rounded top and a square base. */
function colPath(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

/** Bar with a 4px rounded right end and a square start. */
function barPath(x: number, y: number, w: number, h: number, r: number) {
  if (w <= 0) return "";
  const rr = Math.min(r, w, h / 2);
  return `M${x},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} H${x} Z`;
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(8, x - 80), width - 168);
  return (
    <div role="status" className="pointer-events-none absolute z-10 w-40 rounded-xl border border-line bg-surface p-2.5 text-sm shadow-lg" style={{ left, top: Math.max(0, y - 8), transform: "translateY(-100%)" }}>
      {children}
    </div>
  );
}

export type Series = { key: string; name: string; color: string };

export function StackedColumns({ data, series, title, height = 240, tableCaption }: { data: { label: string; short: string; values: number[] }[]; series: Series[]; title: string; height?: number; tableCaption: string }) {
  const { t, intl } = useI18n();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  const pad = { top: 12, right: 8, bottom: 26, left: 36 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const totals = data.map((d) => d.values.reduce((a, b) => a + b, 0));
  const { max, ticks } = niceTicks(Math.max(0, ...totals));
  const band = data.length ? w / data.length : w;
  const colW = Math.max(3, Math.min(24, band * 0.62));
  const y = (v: number) => pad.top + h - (v / max) * h;
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.floor(w / 56)));

  return (
    <figure className="space-y-3">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span id={titleId} className="font-semibold text-heading">{title}</span>
        <span className="flex flex-wrap gap-3 text-sm text-fg-muted" aria-label={t("Legend")}>
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5"><span className="inline-block size-3 rounded-[3px]" style={{ background: s.color }} aria-hidden />{s.name}</span>
          ))}
        </span>
      </figcaption>
      <div ref={ref} className="relative">
        <svg
          width={width}
          height={height}
          role="img"
          aria-labelledby={titleId}
          tabIndex={0}
          className="block rounded-lg focus-visible:outline-3 focus-visible:outline-offset-2"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setActive((a) => Math.min(data.length - 1, (a ?? -1) + 1));
            else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? data.length) - 1));
            else if (e.key === "Escape") setActive(null);
            else return;
            e.preventDefault();
          }}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--chart-axis)" : "var(--chart-grid)"} strokeWidth={1} shapeRendering="crispEdges" />
              <text x={pad.left - 6} y={y(v)} dy="0.32em" textAnchor="end" className="fill-fg-muted text-[11px] tabular-nums">{compact(v, intl)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.left + band * i + band / 2;
            let acc = 0;
            const top = d.values.reduce((last, v, si) => (v > 0 ? si : last), -1);
            return (
              <g key={d.label} opacity={active === null || active === i ? 1 : 0.55}>
                {d.values.map((v, si) => {
                  if (v <= 0) return null;
                  const y0 = y(acc);
                  acc += v;
                  const y1 = y(acc);
                  // 2px surface gap between stacked segments.
                  const gap = si > 0 && acc - v > 0 ? 2 : 0;
                  const segH = y0 - y1 - gap;
                  return si === top ? (
                    <path key={si} d={colPath(cx - colW / 2, y1, colW, segH, 4)} fill={series[si]!.color} />
                  ) : (
                    <rect key={si} x={cx - colW / 2} y={y1} width={colW} height={Math.max(0, segH)} fill={series[si]!.color} />
                  );
                })}
                {i % labelEvery === 0 ? <text x={cx} y={height - 8} textAnchor="middle" className="fill-fg-muted text-[11px]">{d.short}</text> : null}
                <rect x={pad.left + band * i} y={pad.top} width={band} height={h} fill="transparent" onPointerMove={() => setActive(i)} onPointerDown={() => setActive(i)} />
              </g>
            );
          })}
        </svg>
        {active !== null && data[active] ? (
          <Tooltip x={pad.left + band * active + band / 2} y={y(totals[active]!)} width={width}>
            <p className="mb-1 text-fg-muted">{data[active]!.label}</p>
            {series.map((s, si) => (
              <p key={s.key} className="flex items-center gap-2">
                <span className="inline-block h-0.5 w-3 rounded" style={{ background: s.color }} aria-hidden />
                <strong className="tabular-nums text-fg">{data[active]!.values[si]}</strong>
                <span className="text-fg-muted">{s.name}</span>
              </p>
            ))}
            <p className="mt-1 border-t border-line pt-1 text-fg-muted">{t("Total")} <strong className="text-fg">{totals[active]}</strong></p>
          </Tooltip>
        ) : null}
      </div>
      <details className="text-sm">
        <summary className="tap inline-flex cursor-pointer items-center text-primary underline">{t("Show as table")}</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-line">
          <table className="w-full text-left">
            <caption className="sr-only">{tableCaption}</caption>
            <thead className="sticky top-0 bg-surface"><tr><th scope="col" className="p-2">{t("Date")}</th>{series.map((s) => <th key={s.key} scope="col" className="p-2 text-end">{s.name}</th>)}<th scope="col" className="p-2 text-end">{t("Total")}</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.map((d, i) => (
                <tr key={d.label}><th scope="row" className="p-2 font-normal">{d.label}</th>{d.values.map((v, si) => <td key={si} className="p-2 text-end tabular-nums">{v}</td>)}<td className="p-2 text-end tabular-nums">{totals[i]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

export function HBars({ data, title, tableCaption, valueHeader }: { data: { label: string; value: number }[]; title: string; tableCaption: string; valueHeader: string }) {
  const { t, intl } = useI18n();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  const fmt = (n: number) => compact(n, intl);
  // Labels sit above each bar so long names never get cut off, even on phones.
  const rowH = 44;
  const barH = 16;
  const valueW = 48;
  const w = width - valueW;
  const max = Math.max(1, ...data.map((d) => d.value));
  const height = data.length * rowH;
  return (
    <figure className="space-y-3">
      <figcaption id={titleId} className="font-semibold text-heading">{title}</figcaption>
      <div ref={ref} className="relative">
        {data.length ? (
          <svg width={width} height={height} role="img" aria-labelledby={titleId} className="block" onPointerLeave={() => setActive(null)}>
            {data.map((d, i) => {
              const y0 = i * rowH + 20;
              const bw = Math.max(2, (d.value / max) * w);
              return (
                <g key={d.label} opacity={active === null || active === i ? 1 : 0.55}>
                  <text x={0} y={i * rowH + 12} className="fill-fg text-[12.5px]">{d.label}</text>
                  <line x1={0.5} x2={0.5} y1={y0 - 2} y2={y0 + barH + 2} stroke="var(--chart-axis)" strokeWidth={1} />
                  <path d={barPath(0, y0, bw, barH, 4)} fill="var(--series-1)" />
                  <text x={bw + 6} y={y0 + barH / 2} dy="0.32em" className="fill-fg-muted text-[12px] tabular-nums">{fmt(d.value)}</text>
                  <rect x={0} y={i * rowH} width={width} height={rowH} fill="transparent" onPointerMove={() => setActive(i)} />
                </g>
              );
            })}
          </svg>
        ) : (
          <p className="text-fg-muted">{t("No data for this period.")}</p>
        )}
        {active !== null && data[active] ? (
          <Tooltip x={(data[active]!.value / max) * w} y={active * rowH + 18} width={width}>
            <p className="font-semibold tabular-nums text-fg">{fmt(data[active]!.value)}</p>
            <p className="text-fg-muted">{data[active]!.label}</p>
          </Tooltip>
        ) : null}
      </div>
      <details className="text-sm">
        <summary className="tap inline-flex cursor-pointer items-center text-primary underline">{t("Show as table")}</summary>
        <table className="mt-2 w-full text-left">
          <caption className="sr-only">{tableCaption}</caption>
          <thead><tr><th scope="col" className="p-2">{t("Name")}</th><th scope="col" className="p-2 text-end">{valueHeader}</th></tr></thead>
          <tbody className="divide-y divide-line">{data.map((d) => <tr key={d.label}><th scope="row" className="p-2 font-normal">{d.label}</th><td className="p-2 text-end tabular-nums">{fmt(d.value)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

/** Time series with crosshair tooltip. Optional target lines (e.g. BP goal). One y-axis. */
export function LineChart({ points, series, title, unit, targets = [], height = 240, tableCaption }: { points: { at: string; label: string; values: (number | null)[] }[]; series: Series[]; title: string; unit: string; targets?: { value: number; label: string }[]; height?: number; tableCaption: string }) {
  const { t, intl } = useI18n();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  const pad = { top: 14, right: 44, bottom: 26, left: 40 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const all = points.flatMap((p) => p.values.filter((v): v is number => v !== null)).concat(targets.map((x) => x.value));
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = Math.max(1, hi - lo);
  const { ticks: rawTicks } = niceTicks(span);
  const step = rawTicks[1] ?? 1;
  const yMin = Math.floor((lo - span * 0.1) / step) * step;
  const yMax = Math.ceil((hi + span * 0.1) / step) * step;
  const ticks = Array.from({ length: Math.round((yMax - yMin) / step) + 1 }, (_, i) => yMin + i * step).filter((_, i, a) => a.length <= 7 || i % 2 === 0);
  const times = points.map((p) => new Date(p.at).getTime());
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const x = (ms: number) => pad.left + (t1 === t0 ? w / 2 : ((ms - t0) / (t1 - t0)) * w);
  const y = (v: number) => pad.top + h - ((v - yMin) / (yMax - yMin)) * h;
  const nearest = (px: number) => {
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(times[i]!) - px) < Math.abs(x(times[best]!) - px)) best = i;
    return best;
  };
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(w / 70))));
  if (!points.length) return <p className="text-fg-muted">{t("No readings yet.")}</p>;
  return (
    <figure className="space-y-3">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span id={titleId} className="font-semibold text-heading">{title}</span>
        {series.length > 1 ? (
          <span className="flex flex-wrap gap-3 text-sm text-fg-muted" aria-label={t("Legend")}>
            {series.map((s) => <span key={s.key} className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} aria-hidden />{s.name}</span>)}
          </span>
        ) : null}
      </figcaption>
      <div ref={ref} className="relative">
        <svg
          width={width}
          height={height}
          role="img"
          aria-labelledby={titleId}
          tabIndex={0}
          className="block touch-pan-y rounded-lg focus-visible:outline-3 focus-visible:outline-offset-2"
          onPointerMove={(e) => setActive(nearest(e.clientX - e.currentTarget.getBoundingClientRect().left))}
          onPointerLeave={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setActive((a) => Math.min(points.length - 1, (a ?? -1) + 1));
            else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? points.length) - 1));
            else if (e.key === "Escape") setActive(null);
            else return;
            e.preventDefault();
          }}
          onBlur={() => setActive(null)}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" strokeWidth={1} shapeRendering="crispEdges" />
              <text x={pad.left - 6} y={y(v)} dy="0.32em" textAnchor="end" className="fill-fg-muted text-[11px] tabular-nums">{compact(v, intl)}</text>
            </g>
          ))}
          {targets.map((tg) => (
            <g key={tg.label}>
              <line x1={pad.left} x2={width - pad.right} y1={y(tg.value)} y2={y(tg.value)} stroke="var(--chart-axis)" strokeWidth={1} />
              <text x={width - pad.right + 4} y={y(tg.value)} dy="0.32em" className="fill-fg-muted text-[10.5px]">{tg.label}</text>
            </g>
          ))}
          {points.map((p, i) => (i % labelEvery === 0 ? <text key={p.at} x={x(times[i]!)} y={height - 8} textAnchor="middle" className="fill-fg-muted text-[11px]">{p.label}</text> : null))}
          {active !== null ? <line x1={x(times[active]!)} x2={x(times[active]!)} y1={pad.top} y2={pad.top + h} stroke="var(--chart-axis)" strokeWidth={1} /> : null}
          {series.map((s, si) => {
            const pts = points.map((p, i) => (p.values[si] == null ? null : [x(times[i]!), y(p.values[si]!)] as const)).filter(Boolean) as (readonly [number, number])[];
            const last = pts[pts.length - 1];
            return (
              <g key={s.key}>
                <polyline points={pts.map(([a, b]) => `${a},${b}`).join(" ")} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {last ? <circle cx={last[0]} cy={last[1]} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} /> : null}
                {active !== null && points[active]!.values[si] != null ? <circle cx={x(times[active]!)} cy={y(points[active]!.values[si]!)} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} /> : null}
              </g>
            );
          })}
        </svg>
        {active !== null ? (
          <Tooltip x={x(times[active]!)} y={Math.min(...points[active]!.values.filter((v): v is number => v !== null).map(y))} width={width}>
            <p className="mb-1 text-fg-muted">{points[active]!.label}</p>
            {series.map((s, si) => (points[active]!.values[si] != null ? (
              <p key={s.key} className="flex items-center gap-2">
                <span className="inline-block h-0.5 w-3 rounded" style={{ background: s.color }} aria-hidden />
                <strong className="tabular-nums text-fg">{points[active]!.values[si]}</strong>
                <span className="text-fg-muted">{series.length > 1 ? s.name : unit}</span>
              </p>
            ) : null))}
          </Tooltip>
        ) : null}
      </div>
      <details className="text-sm">
        <summary className="tap inline-flex cursor-pointer items-center text-primary underline">{t("Show as table")}</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-line">
          <table className="w-full text-left">
            <caption className="sr-only">{tableCaption}</caption>
            <thead className="sticky top-0 bg-surface"><tr><th scope="col" className="p-2">{t("When")}</th>{series.map((s) => <th key={s.key} scope="col" className="p-2 text-end">{s.name} ({unit})</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{[...points].reverse().map((p) => <tr key={p.at}><th scope="row" className="p-2 font-normal">{p.label}</th>{p.values.map((v, i) => <td key={i} className="p-2 text-end tabular-nums">{v ?? "—"}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
