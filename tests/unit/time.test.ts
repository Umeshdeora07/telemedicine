import { describe, expect, it } from "vitest";
import { addDays, canonicalZone, dayBoundsUtc, dayInZone, zonedTimeToUtc } from "@/lib/time";

describe("time zones", () => {
  it("converts a local clinic time in India to UTC", () => {
    expect(zonedTimeToUtc("2026-10-14", "10:00", "Asia/Kolkata").toISOString()).toBe("2026-10-14T04:30:00.000Z");
  });
  it("handles daylight saving in London", () => {
    expect(zonedTimeToUtc("2026-07-01", "09:00", "Europe/London").toISOString()).toBe("2026-07-01T08:00:00.000Z");
    expect(zonedTimeToUtc("2026-12-01", "09:00", "Europe/London").toISOString()).toBe("2026-12-01T09:00:00.000Z");
  });
  it("finds the local calendar day", () => {
    expect(dayInZone(new Date("2026-10-14T20:00:00Z"), "Asia/Kolkata")).toBe("2026-10-15");
    expect(dayInZone(new Date("2026-10-14T20:00:00Z"), "America/New_York")).toBe("2026-10-14");
  });
  it("day bounds cover 24 hours", () => {
    const { start, end } = dayBoundsUtc("2026-10-14", "Asia/Kolkata");
    expect(end.getTime() - start.getTime()).toBe(86400_000);
  });
  it("adds days across month ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
  it("maps the old Calcutta zone name", () => {
    expect(canonicalZone("Asia/Calcutta")).toBe("Asia/Kolkata");
  });
});
