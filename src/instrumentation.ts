/**
 * Starts the background scheduler (reminders, no-show refunds, slot
 * generation, licence checks) when the Node.js server boots.
 * On serverless hosting, set DISABLE_INTERNAL_SCHEDULER=1 and call
 * POST /api/cron/tick every minute with the CRON_SECRET instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DISABLE_INTERNAL_SCHEDULER === "1" || process.env.NEXT_PHASE === "phase-production-build") return;
  const g = globalThis as unknown as { __schedulerStarted?: boolean };
  if (g.__schedulerStarted) return;
  g.__schedulerStarted = true;
  const { startScheduler } = await import("./server/scheduler");
  startScheduler();
}
