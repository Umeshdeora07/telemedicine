import QRCode from "qrcode";
import { rgb } from "pdf-lib";
import type { RxSnapshot } from "../rx";
import { FREQUENCIES, TIMINGS } from "../tpg";
import { A4, COLORS, Writer } from "./layout";
import { pdfSafe } from "./text";

const MODE: Record<string, string> = { video: "Video teleconsultation", audio: "Audio teleconsultation", chat: "Chat (text) teleconsultation", in_clinic: "In-clinic consultation" };

export async function prescriptionPdf(s: RxSnapshot, opts: { verifyUrl: string; signature: string; status: string; signatureImage?: Buffer | null; timeZone: string }) {
  const w = await Writer.create();
  const page = () => w.page;
  const fmtDate = (iso: string, withTime = true) =>
    new Intl.DateTimeFormat("en-IN", { timeZone: opts.timeZone, day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}) }).format(new Date(iso));

  // Header band
  page().drawRectangle({ x: 0, y: A4.h - 118, width: A4.w, height: 118, color: rgb(0.94, 0.97, 0.965) });
  w.y = A4.h - 40;
  w.text(s.doctor.name, { size: 18, bold: true, color: COLORS.navy, gap: 3, maxWidth: 330 });
  w.text(`${s.doctor.qualifications}${s.doctor.specialty ? ` · ${s.doctor.specialty}` : ""}`, { size: 9.5, color: COLORS.text, maxWidth: 330 });
  for (const r of s.doctor.registrations) w.text(`Reg. No. ${r.number} — ${r.issuingBody}${r.region ? ` (${r.region})` : ""}`, { size: 9, color: COLORS.muted, maxWidth: 330, gap: 2 });
  const rightX = 390;
  const top = A4.h - 40;
  page().drawText("e-PRESCRIPTION", { x: rightX, y: top - 4, size: 12, font: w.bold, color: COLORS.teal });
  page().drawText(pdfSafe(`No. ${s.number}`), { x: rightX, y: top - 20, size: 9, font: w.font, color: COLORS.text });
  page().drawText(pdfSafe(fmtDate(s.issuedAt)), { x: rightX, y: top - 33, size: 9, font: w.font, color: COLORS.text });
  page().drawText(pdfSafe(MODE[s.consult.mode] ?? s.consult.mode), { x: rightX, y: top - 46, size: 9, font: w.font, color: COLORS.muted });
  page().drawText(pdfSafe(`Booking ${s.consult.ref} · ${s.consult.type === "follow_up" ? "Follow-up" : "First consult"}`), { x: rightX, y: top - 59, size: 8.5, font: w.font, color: COLORS.muted });
  w.y = A4.h - 128;
  const clinicLine = s.doctor.clinic ? `${s.doctor.clinic.name}, ${s.doctor.clinic.address}${s.doctor.clinic.phone ? ` · ${s.doctor.clinic.phone}` : ""}` : `Teleconsultation via ${s.brand}`;
  w.text(clinicLine, { size: 8.5, color: COLORS.muted, gap: 2 });
  w.text(`Contact: ${s.doctor.contact}`, { size: 8.5, color: COLORS.muted });
  if (opts.status === "cancelled") w.text("CANCELLED — this prescription is no longer valid.", { size: 12, bold: true, color: COLORS.danger });
  w.rule();

  // Patient
  const pY = w.y;
  page().drawText(pdfSafe(`Patient: ${s.patient.name}`), { x: w.margin, y: pY - 10, size: 11, font: w.bold, color: COLORS.navy });
  page().drawText(pdfSafe(`Age: ${s.patient.age ?? "-"}   Sex: ${s.patient.sex ? s.patient.sex[0]!.toUpperCase() + s.patient.sex.slice(1) : "-"}   Location during consult: ${s.patient.location}`), { x: w.margin, y: pY - 26, size: 9.5, font: w.font, color: COLORS.text });
  w.y = pY - 40;
  w.heading(s.provisional ? "Provisional diagnosis" : "Diagnosis");
  w.text(s.diagnosis, { size: 11 });

  // Medicines
  if (s.items.length) {
    w.heading("Rx");
    const cols = [
      { label: "#", x: 0, w: 16 },
      { label: "Medicine", x: 16, w: 170 },
      { label: "Dose", x: 186, w: 80 },
      { label: "How often", x: 266, w: 110 },
      { label: "When", x: 376, w: 70 },
      { label: "Days", x: 446, w: 40 },
    ];
    w.ensure(20);
    page().drawRectangle({ x: w.margin - 4, y: w.y - 14, width: w.width + 8, height: 18, color: rgb(0.94, 0.97, 0.965) });
    for (const c of cols) page().drawText(c.label, { x: w.margin + c.x, y: w.y - 9, size: 8.5, font: w.bold, color: COLORS.navy });
    w.y -= 22;
    s.items.forEach((it, i) => {
      const lines = [
        [String(i + 1)],
        w.wrap(`${it.name} ${it.strength}`.trim() + ` (${it.form})`, w.bold, 9.5, cols[1]!.w - 6),
        w.wrap(it.dose, w.font, 9, cols[2]!.w - 6),
        w.wrap(`${it.frequency} — ${FREQUENCIES[it.frequency]?.label ?? it.frequencyLabel}`, w.font, 9, cols[3]!.w - 6),
        w.wrap(TIMINGS[it.timing] ?? it.timing, w.font, 9, cols[4]!.w - 6),
        [String(it.durationDays)],
      ];
      const h = Math.max(...lines.map((l) => l.length)) * 12 + (it.instructions ? 12 : 0) + 6;
      w.ensure(h);
      lines.forEach((ls, ci) => ls.forEach((l, li) => page().drawText(l, { x: w.margin + cols[ci]!.x, y: w.y - 9 - li * 12, size: ci === 1 ? 9.5 : 9, font: ci === 1 ? w.bold : w.font, color: COLORS.text })));
      if (it.instructions) page().drawText(pdfSafe(`Note: ${it.instructions}`).slice(0, 110), { x: w.margin + 16, y: w.y - 9 - (Math.max(...lines.map((l) => l.length))) * 12, size: 8.5, font: w.font, color: COLORS.muted });
      w.y -= h;
      page().drawLine({ start: { x: w.margin, y: w.y + 3 }, end: { x: A4.w - w.margin, y: w.y + 3 }, thickness: 0.5, color: COLORS.line });
    });
  }
  if (s.advice) {
    w.heading("Advice");
    w.text(s.advice, { size: 10 });
  }
  if (s.investigations.length) {
    w.heading("Investigations");
    w.text(s.investigations.join(", "), { size: 10 });
  }
  if (s.followUpDate) {
    w.heading("Follow-up");
    w.text(`On or before ${fmtDate(s.followUpDate + "T06:00:00Z", false)}, or earlier if symptoms get worse.`, { size: 10 });
  }

  // Signature + QR
  w.ensure(130);
  w.space(14);
  const sigTop = w.y;
  const qr = await QRCode.toBuffer(opts.verifyUrl, { type: "png", margin: 1, width: 240, errorCorrectionLevel: "M" });
  const qrImg = await w.doc.embedPng(qr);
  page().drawImage(qrImg, { x: A4.w - w.margin - 92, y: sigTop - 96, width: 92, height: 92 });
  page().drawText("Scan to verify", { x: A4.w - w.margin - 84, y: sigTop - 108, size: 7.5, font: w.font, color: COLORS.muted });
  let sx = w.margin;
  if (opts.signatureImage) {
    try {
      const img = await w.doc.embedPng(opts.signatureImage).catch(() => w.doc.embedJpg(opts.signatureImage!));
      const ratio = img.width / img.height;
      page().drawImage(img, { x: sx, y: sigTop - 44, width: Math.min(140, 40 * ratio), height: 40 });
    } catch {
      /* ignore bad image */
    }
  }
  page().drawText(pdfSafe(`Digitally signed by ${s.doctor.name}`), { x: sx, y: sigTop - 58, size: 10, font: w.bold, color: COLORS.navy });
  page().drawText(pdfSafe(`Signed ${fmtDate(s.issuedAt)} · seal ${opts.signature.slice(0, 16)}…`), { x: sx, y: sigTop - 72, size: 8, font: w.font, color: COLORS.muted });
  sx += 0;
  page().drawText(pdfSafe(`Verify at ${opts.verifyUrl.replace(/^https?:\/\//, "").split("?")[0]}`), { x: sx, y: sigTop - 86, size: 8, font: w.font, color: COLORS.muted });
  w.y = sigTop - 118;
  const law = s.patient.location.startsWith("IN") || s.patient.location.endsWith("IN")
    ? "Issued through teleconsultation in line with the Telemedicine Practice Guidelines, 2020 (India)."
    : "Issued through teleconsultation by a doctor licensed for the patient's location.";
  w.footer(`${law} ${s.brand} · Not valid for medicines on the prohibited list.`);
  return w.save();
}
