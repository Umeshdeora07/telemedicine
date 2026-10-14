import { Writer, COLORS } from "./layout";

/** A plain one-section PDF (demo lab reports, generic letters). */
export async function simplePdf(opts: { title: string; subtitle?: string; sections: { heading?: string; lines: string[] }[]; footer: string }) {
  const w = await Writer.create();
  w.text(opts.title, { size: 18, bold: true, color: COLORS.navy, gap: 6 });
  if (opts.subtitle) w.text(opts.subtitle, { size: 10, color: COLORS.muted });
  w.rule();
  for (const s of opts.sections) {
    if (s.heading) w.heading(s.heading);
    for (const line of s.lines) w.text(line, { size: 10.5 });
    w.space(4);
  }
  w.footer(opts.footer);
  return w.save();
}
