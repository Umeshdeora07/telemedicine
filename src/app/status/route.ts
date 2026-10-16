import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, rows } from "@/db";
import { env } from "@/config/env";
import { databaseUrl, setupProblems } from "@/lib/setup-check";
import { statusPage, type StatusRow } from "@/lib/setup-page";

export const dynamic = "force-dynamic";
// The first request after a deploy may create the tables and load demo data.
export const maxDuration = 120;

/** Plain-language reading of a database error. Never includes addresses or passwords. */
function explain(e: unknown): { detail: string; steps: string[] } {
  const err = e as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  const code = err.cause?.code ?? err.code ?? "";
  const message = `${err.cause?.message ?? ""} ${err.message ?? ""}`;
  const reconnect = "In Vercel → Storage, open the Neon database and connect it to this project again (Production ticked), then redeploy.";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN")
    return { detail: "The database address can't be found.", steps: ["Check the database setting holds the full connection string.", reconnect] };
  if (["ECONNREFUSED", "ETIMEDOUT", "ECONNRESET", "CONNECT_TIMEOUT", "CONNECTION_CLOSED"].includes(code) || /timeout/i.test(message))
    return {
      detail: "The site can't reach the database right now.",
      steps: ["In Neon, check the project exists and hasn't used up its free monthly hours (it pauses until next month).", "Wait a minute and reload this page."],
    };
  // 28P01/28000 from PostgreSQL; poolers (Neon, PgBouncer) report a bad password as 08P01.
  if (code === "28P01" || code === "28000" || (code === "08P01" && /auth|password/i.test(message)) || /password authentication failed/i.test(message))
    return { detail: "The database rejected the username or password.", steps: [reconnect] };
  if (code === "3D000") return { detail: "The database named in the setting doesn't exist.", steps: [reconnect] };
  if (code === "53300") return { detail: "The database has too many connections open.", steps: ["Wait a minute and reload this page."] };
  if (code === "42501" || /app_rls/.test(message))
    return {
      detail: "The database user isn't allowed to finish setting up (it needs permission to create roles).",
      steps: ["With Neon this works by default: use the database's default owner role (neondb_owner) in the connection, not a role you created yourself.", reconnect],
    };
  return { detail: `The database reported an error${code ? ` (code ${code})` : ""}.`, steps: ["Open Vercel → your project → Logs and look for lines starting with [db].", reconnect] };
}

async function withTimeout<T>(p: Promise<T>, ms: number) {
  return Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "STATUS_TIMEOUT" })), ms))]);
}

/** Setup checklist for the site owner: settings, database, demo data, background jobs. No secrets are shown. */
export async function GET() {
  const rowsOut: StatusRow[] = [];
  const problems = setupProblems();
  const db = databaseUrl();

  const secretProblem = problems.find((p) => p.id.startsWith("secret"));
  rowsOut.push(
    secretProblem
      ? { label: "Secret key", state: "problem", detail: secretProblem.title, steps: secretProblem.steps }
      : { label: "Secret key", state: "ok", detail: "Set." },
  );

  const dbProblem = problems.find((p) => p.id === "database-missing");
  if (dbProblem) rowsOut.push({ label: "Database", state: "problem", detail: dbProblem.title, steps: dbProblem.steps });
  else if (!db) rowsOut.push({ label: "Database", state: "info", detail: "Using the built-in local database (fine on a computer, not on a hosting service)." });
  else {
    try {
      const conn = await withTimeout(getDb(), 90_000);
      rowsOut.push({ label: "Database", state: "ok", detail: `Connected and set up (setting ${db.name}).` });
      try {
        const [u] = rows<{ n: number }>(await conn.execute(sql`select count(*)::int as n from users`));
        const [d] = rows<{ value: string | null }>(await conn.execute(sql`select value #>> '{}' as value from settings where key = 'demo:loaded_on'`));
        const n = Number(u?.n ?? 0);
        rowsOut.push(
          n > 0
            ? { label: "Accounts", state: "ok", detail: `${n} accounts${d?.value ? `; demo data loaded on ${d.value}` : ""}.` }
            : {
                label: "Accounts",
                state: env.demoMode ? "problem" : "info",
                detail: env.demoMode ? "The database is empty: demo data didn't load." : "No accounts yet.",
                steps: env.demoMode ? ["Make sure DEMO_AUTO_SEED isn't set to false, then redeploy.", "Open Vercel → Logs and look for lines starting with [db]."] : undefined,
              },
        );
        const [job] = rows<{ value: string | null }>(await conn.execute(sql`select value #>> '{}' as value from settings where key = 'job:hourly'`));
        rowsOut.push({
          label: "Background jobs (reminders, refunds)",
          state: "info",
          detail: job?.value ? `Last ran ${new Date(job.value).toUTCString()}.` : "Haven't run yet.",
          steps: process.env.VERCEL ? ["For reminders, set up a free job at cron-job.org that opens /api/cron/tick every 15 minutes with the header Authorization: Bearer <your CRON_SECRET>."] : undefined,
        });
      } catch (e) {
        const x = explain(e);
        rowsOut.push({ label: "Reading data", state: "problem", detail: x.detail, steps: x.steps });
      }
    } catch (e) {
      if ((e as { code?: string }).code === "STATUS_TIMEOUT") {
        rowsOut.push({ label: "Database", state: "info", detail: "Still setting up the database (the first visit can take a minute).", steps: ["Reload this page in a minute."] });
      } else {
        const x = explain(e);
        rowsOut.push({ label: "Database", state: "problem", detail: x.detail, steps: x.steps });
      }
    }
  }

  const signIn = problems.find((p) => p.id === "no-sign-in");
  rowsOut.push(
    signIn
      ? { label: "Logging in", state: "problem", detail: signIn.title, steps: signIn.steps }
      : { label: "Logging in", state: "ok", detail: env.demoMode ? "Demo mode: one-tap demo accounts on the login page." : "Login codes are sent by SMS or email." },
  );
  rowsOut.push({ label: "Site address", state: "info", detail: env.appUrl });

  const bad = rowsOut.filter((r) => r.state === "problem").length;
  const html = statusPage({
    heading: bad ? `${bad} thing${bad === 1 ? "" : "s"} to fix` : "Everything is working",
    intro: bad ? "Follow the steps under each red cross, then reload this page." : "Your site is set up. Open the home page to use it.",
    rows: rowsOut,
    footer: bad ? undefined : '<a href="/">Go to the site</a>',
  });
  return new NextResponse(html, { status: bad ? 503 : 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
