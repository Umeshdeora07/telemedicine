/**
 * The built-in PDF fonts only cover Western European characters. Replace
 * symbols we commonly use, strip accents, and drop anything else so PDF
 * generation never fails on user-entered text.
 */
const MAP: Record<string, string> = {
  "₹": "Rs.",
  "৳": "Tk",
  "€": "EUR ",
  "—": "-",
  "–": "-",
  "’": "'",
  "‘": "'",
  "“": '"',
  "”": '"',
  "…": "...",
  "•": "·",
  "×": "x",
  "→": "->",
  "≈": "~",
  "°": " deg",
  " ": " ",
};

export function pdfSafe(s: string | null | undefined) {
  if (!s) return "";
  let out = "";
  for (const ch of s.normalize("NFKD")) {
    if (MAP[ch] !== undefined) out += MAP[ch];
    else if (/[̀-ͯ]/.test(ch)) continue;
    else {
      const code = ch.charCodeAt(0);
      // Printable ASCII and Latin-1 are in the PDF standard fonts' encoding.
      out += (code >= 0x20 && code <= 0x7e) || (code >= 0xa1 && code <= 0xff) ? ch : code === 0x0a ? "\n" : "";
    }
  }
  return out;
}
