import { A4, COLORS, Writer } from "./layout";

/** Patient-friendly consult summary (used in the insurance claim pack and hand-over letters). */
export async function summaryPdf(s: {
  title: string;
  brand: string;
  patient: string;
  doctor: string;
  doctorRegistration: string;
  date: string;
  sections: { heading: string; text: string }[];
  footer: string;
}) {
  const w = await Writer.create();
  w.text(s.title, { size: 17, bold: true, color: COLORS.navy, gap: 6 });
  w.text(`${s.patient} · ${s.date}`, { size: 10, color: COLORS.muted });
  w.text(`${s.doctor} · ${s.doctorRegistration}`, { size: 10, color: COLORS.muted });
  w.rule();
  for (const sec of s.sections.filter((x) => x.text.trim())) {
    w.heading(sec.heading);
    w.text(sec.text, { size: 10.5 });
  }
  void A4;
  w.footer(`${s.brand} · ${s.footer}`);
  return w.save();
}
