import { tick } from "./jobs";

/** Run a tick shortly after boot, then every minute. Errors are logged, never thrown. */
export function startScheduler(intervalMs = 60_000) {
  const run = () => {
    tick()
      .then((r) => {
        const busy = Object.entries(r).filter(([, v]) => v !== 0);
        if (busy.length && process.env.NODE_ENV !== "test") console.log("[scheduler]", Object.fromEntries(busy));
      })
      .catch((e) => console.error("[scheduler] tick failed", e));
  };
  setTimeout(run, 10_000).unref?.();
  setInterval(run, intervalMs).unref?.();
}
