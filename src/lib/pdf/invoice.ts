import { brand } from "@/config/brand";
import { formatMoney } from "../format";
import { A4, COLORS, Writer } from "./layout";
import { pdfSafe } from "./text";

export type InvoiceData = {
  number: string;
  issuedAt: Date;
  currency: string;
  billing: { name: string; email?: string; phone?: string; gstin?: string; state?: string; country: string };
  placeOfSupply: string;
  lines: { description: string; sac?: string; amountMinor: number }[];
  taxLines: { label: string; rate: number; amountMinor: number; sac?: string }[];
  totalMinor: number;
  refundedMinor: number;
  paymentRef: string;
  method: string | null;
  fx?: { rate: number; asOf: string | null } | null;
  timeZone: string;
};

/** Tax invoice (GST for India; export of service for payments in other currencies). */
export async function invoicePdf(d: InvoiceData) {
  const w = await Writer.create();
  const money = (m: number) => pdfSafe(formatMoney(m, d.currency, "en-IN")).replace("Rs.", "INR ");
  const india = d.currency === "INR";
  w.text(india ? "TAX INVOICE" : "INVOICE", { size: 16, bold: true, color: COLORS.teal, gap: 6 });
  w.text(brand.legalEntity, { size: 11, bold: true, color: COLORS.navy });
  w.text(brand.registeredAddress, { size: 9, color: COLORS.muted });
  w.text(`GSTIN: ${brand.gstin}`, { size: 9, color: COLORS.muted });
  const top = A4.h - 48;
  const rx = 380;
  for (const [i, [k, v]] of [
    ["Invoice no.", d.number],
    ["Date", new Intl.DateTimeFormat("en-IN", { timeZone: d.timeZone, dateStyle: "medium" }).format(d.issuedAt)],
    ["Payment ref.", d.paymentRef],
    ["Place of supply", d.placeOfSupply],
  ].entries()) {
    w.page.drawText(k!, { x: rx, y: top - i * 14, size: 8.5, font: w.font, color: COLORS.muted });
    w.page.drawText(pdfSafe(v!), { x: rx + 80, y: top - i * 14, size: 8.5, font: w.bold, color: COLORS.text });
  }
  w.rule();
  w.heading("Billed to");
  w.text(d.billing.name || "-", { size: 10.5, bold: true });
  if (d.billing.email) w.text(d.billing.email, { size: 9 });
  if (d.billing.phone) w.text(d.billing.phone, { size: 9 });
  if (d.billing.gstin) w.text(`GSTIN: ${d.billing.gstin}`, { size: 9 });
  w.text([d.billing.state, d.billing.country].filter(Boolean).join(", "), { size: 9, color: COLORS.muted });
  w.space(6);
  w.heading("Details");
  const row = (label: string, sac: string | undefined, amount: string, bold = false) => {
    w.ensure(16);
    w.page.drawText(pdfSafe(label).slice(0, 80), { x: w.margin, y: w.y - 10, size: 9.5, font: bold ? w.bold : w.font, color: COLORS.text });
    if (sac) w.page.drawText(`SAC ${sac}`, { x: w.margin + 330, y: w.y - 10, size: 8.5, font: w.font, color: COLORS.muted });
    const width = (bold ? w.bold : w.font).widthOfTextAtSize(amount, 9.5);
    w.page.drawText(amount, { x: A4.w - w.margin - width, y: w.y - 10, size: 9.5, font: bold ? w.bold : w.font, color: COLORS.text });
    w.y -= 16;
  };
  for (const l of d.lines) row(l.description, l.sac, money(l.amountMinor));
  for (const tl of d.taxLines.filter((x) => x.rate > 0)) row(`${tl.label} @ ${Math.round(tl.rate * 1000) / 10}%`, tl.sac, money(tl.amountMinor));
  w.rule();
  row("Total paid", undefined, money(d.totalMinor), true);
  if (d.refundedMinor) row("Refunded", undefined, `- ${money(d.refundedMinor)}`);
  w.space(8);
  if (india) w.text("Healthcare services by a registered medical practitioner are exempt from GST. GST is charged on the platform fee only.", { size: 8.5, color: COLORS.muted });
  else w.text("Export of services: zero-rated supply. No GST charged.", { size: 8.5, color: COLORS.muted });
  if (d.fx?.rate && !india) w.text(`Converted from INR at 1 INR = ${d.fx.rate} ${d.currency} (rate of ${d.fx.asOf ?? "-"}).`, { size: 8.5, color: COLORS.muted });
  if (d.method) w.text(`Paid by ${d.method.replace("_", " ")}.`, { size: 8.5, color: COLORS.muted });
  w.text("Tax treatment shown here must be confirmed by the company's tax advisor before launch.", { size: 7.5, color: COLORS.muted });
  w.footer(`${brand.name} · This is a computer-generated invoice and does not need a signature.`);
  return w.save();
}
