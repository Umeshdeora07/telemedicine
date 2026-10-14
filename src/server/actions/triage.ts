"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { AGE_GROUPS, AREAS, DURATIONS, SEVERITIES, encodeTriage, triage, type TriageAnswers } from "@/lib/triage";

const schema = z.object({
  age: z.enum(AGE_GROUPS.map((a) => a.id) as [string, ...string[]]),
  redFlags: z.array(z.string()).max(10),
  area: z.enum(AREAS.map((a) => a.id) as [string, ...string[]]),
  duration: z.enum(DURATIONS.map((a) => a.id) as [string, ...string[]]),
  severity: z.enum(SEVERITIES.map((a) => a.id) as [string, ...string[]]),
  followUps: z.record(z.string(), z.boolean()),
});

/** Work out the suggestion on the server and remember it so the doctor sees the answers. */
export async function submitTriage(input: TriageAnswers) {
  const answers = schema.parse(input) as TriageAnswers;
  const result = triage(answers);
  const stored = { answers, ...result, completedAt: new Date().toISOString() };
  (await cookies()).set("triage", encodeTriage(stored), { path: "/", maxAge: 60 * 60 * 6, httpOnly: true, sameSite: "lax" });
  return result;
}
