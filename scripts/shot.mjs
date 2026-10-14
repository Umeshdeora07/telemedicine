// Dev helper: node scripts/shot.mjs <outDir> <mobile|desktop> <path> [path...]
// Env: LOGIN_PHONE / LOGIN_EMAIL to sign in with a demo account first.
import { chromium } from "@playwright/test";
const [, , out, device, ...paths] = process.argv;
const base = process.env.BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext(
  device === "mobile"
    ? { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "en-IN", timezoneId: "Asia/Kolkata" }
    : { viewport: { width: 1280, height: 860 }, locale: "en-IN", timezoneId: "Asia/Kolkata" },
);
if (process.env.LANG_COOKIE) await ctx.addCookies([{ name: "lang", value: process.env.LANG_COOKIE, url: base }]);
await ctx.addCookies([{ name: "cookie_choice", value: "essential", url: base }]);
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text()); });
if (process.env.LOGIN_PHONE || process.env.LOGIN_EMAIL) {
  await page.goto(base + "/login");
  const label = process.env.LOGIN_LABEL;
  await page.getByRole("button", { name: new RegExp(label) }).first().click();
  await page.waitForLoadState("networkidle");
}
for (const p of paths) {
  const res = await page.goto(base + p, { waitUntil: "networkidle" });
  const name = p.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home";
  if (process.env.SEG) {
    const h = page.viewportSize().height;
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const n = Math.min(Number(process.env.SEG), Math.ceil(total / (h * 2)));
    for (let i = 0; i < n; i++) {
      await page.screenshot({ path: `${out}/${device}-${name}-${i}.png`, clip: { x: 0, y: i * h * 2, width: page.viewportSize().width, height: Math.min(h * 2, total - i * h * 2) }, fullPage: true });
    }
  } else await page.screenshot({ path: `${out}/${device}-${name}.png`, fullPage: process.env.FULL !== "0" });
  console.log(p, res?.status(), page.url());
}
await browser.close();
