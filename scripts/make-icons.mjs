// Regenerate PNG app icons from public/icons/icon.svg (run after changing the logo):
//   node scripts/make-icons.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const svg = await fs.readFile("public/icons/icon.svg", "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_BROWSERS_PATH === "/opt/pw-browsers" ? { executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" } : {});
const page = await browser.newPage();
const out = [
  { file: "icon-192.png", size: 192, pad: 0 },
  { file: "icon-512.png", size: 512, pad: 0 },
  // Maskable icons need the logo inside the central 80% "safe zone".
  { file: "maskable-512.png", size: 512, pad: 0.12, bg: "#0F766E" },
  // iOS shows transparent corners as black, so fill the background.
  { file: "apple-touch-icon.png", size: 180, pad: 0, bg: "#0F766E" },
];
for (const o of out) {
  const inner = Math.round(o.size * (1 - o.pad * 2));
  await page.setViewportSize({ width: o.size, height: o.size });
  await page.setContent(`<html><body style="margin:0;background:${o.bg ?? "transparent"};display:grid;place-items:center;width:${o.size}px;height:${o.size}px">${svg.replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</body></html>`);
  await page.screenshot({ path: `public/icons/${o.file}`, omitBackground: !o.bg });
  console.log("wrote", o.file);
}
await browser.close();
