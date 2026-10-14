import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { pdfSafe } from "./text";

export const A4 = { w: 595.28, h: 841.89 };
export const COLORS = {
  navy: rgb(11 / 255, 37 / 255, 69 / 255),
  teal: rgb(15 / 255, 118 / 255, 110 / 255),
  text: rgb(15 / 255, 23 / 255, 42 / 255),
  muted: rgb(71 / 255, 85 / 255, 105 / 255),
  line: rgb(226 / 255, 232 / 255, 240 / 255),
  soft: rgb(240 / 255, 247 / 255, 246 / 255),
  danger: rgb(220 / 255, 38 / 255, 38 / 255),
};

/** A small cursor-based writer with automatic page breaks. */
export class Writer {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  y = 0;
  margin = 48;
  onNewPage?: (w: Writer) => void;

  static async create() {
    const w = new Writer();
    w.doc = await PDFDocument.create();
    w.font = await w.doc.embedFont(StandardFonts.Helvetica);
    w.bold = await w.doc.embedFont(StandardFonts.HelveticaBold);
    w.addPage();
    return w;
  }

  get width() {
    return A4.w - this.margin * 2;
  }

  addPage() {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.y = A4.h - this.margin;
    this.onNewPage?.(this);
  }

  ensure(space: number) {
    if (this.y - space < this.margin + 30) this.addPage();
  }

  wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
    const lines: string[] = [];
    for (const para of pdfSafe(text).split("\n")) {
      const words = para.split(/\s+/);
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
          lines.push(line);
          line = word;
        } else line = test;
      }
      lines.push(line);
    }
    return lines;
  }

  text(text: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number; maxWidth?: number; gap?: number } = {}) {
    const size = opts.size ?? 10;
    const font = opts.bold ? this.bold : this.font;
    const x = opts.x ?? this.margin;
    const maxWidth = opts.maxWidth ?? this.width - (x - this.margin);
    const lines = this.wrap(text, font, size, maxWidth);
    for (const line of lines) {
      this.ensure(size + 4);
      this.page.drawText(line, { x, y: this.y - size, size, font, color: opts.color ?? COLORS.text });
      this.y -= size + (opts.gap ?? 4);
    }
  }

  label(label: string, value: string, x?: number) {
    this.text(`${label}: `, { size: 9, color: COLORS.muted, x, gap: 0 });
    this.y += 13;
    const lw = this.font.widthOfTextAtSize(pdfSafe(`${label}: `), 9);
    this.text(value, { size: 10, x: (x ?? this.margin) + lw });
  }

  heading(text: string) {
    this.ensure(30);
    this.y -= 8;
    this.text(text.toUpperCase(), { size: 9, bold: true, color: COLORS.teal, gap: 6 });
  }

  rule(color = COLORS.line) {
    this.ensure(10);
    this.page.drawLine({ start: { x: this.margin, y: this.y }, end: { x: A4.w - this.margin, y: this.y }, thickness: 0.8, color });
    this.y -= 10;
  }

  space(n = 8) {
    this.y -= n;
  }

  footer(text: string) {
    const pages = this.doc.getPages();
    pages.forEach((p, i) => {
      const t = pdfSafe(`${text}    Page ${i + 1} of ${pages.length}`);
      p.drawText(t, { x: this.margin, y: 24, size: 7.5, font: this.font, color: COLORS.muted, maxWidth: this.width });
    });
  }

  async save() {
    return Buffer.from(await this.doc.save());
  }
}
