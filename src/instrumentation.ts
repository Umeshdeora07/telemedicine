/**
 * Runs once when the Node.js server boots: checks the settings a hosted site
 * needs, then starts the background scheduler (reminders, no-show refunds,
 * slot generation, licence checks).
 * On serverless hosting, set DISABLE_INTERNAL_SCHEDULER=1 and call
 * POST /api/cron/tick every minute with the CRON_SECRET instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const g = globalThis as unknown as { __bootChecked?: boolean; __schedulerStarted?: boolean };

  if (!g.__bootChecked && process.env.NODE_ENV === "production") {
    g.__bootChecked = true;
    const { env } = await import("./config/env");
    const { checkSecrets } = await import("./lib/crypto");
    checkSecrets();
    // Links in messages, OAuth callbacks and the QR codes printed on
    // prescriptions use this address; a wrong one can't be fixed afterwards.
    if (!env.appUrl.startsWith("https://")) {
      console.error(`[boot] APP_URL is ${env.appUrl}. Set APP_URL to the site's public https address.`);
    }
  }

  // Serverless hosts (Vercel) freeze instances between requests, so a timer
  // can't run there: /api/cron/tick is called by a cron service instead.
  if (process.env.VERCEL || ["1", "true", "yes"].includes((process.env.DISABLE_INTERNAL_SCHEDULER ?? "").toLowerCase())) return;
  if (g.__schedulerStarted) return;
  g.__schedulerStarted = true;
  const { startScheduler } = await import("./server/scheduler");
  startScheduler();
}
