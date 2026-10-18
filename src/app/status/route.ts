import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { connectionUrl, getDb, rows } from "@/db";
import { env } from "@/config/env";
import { databaseUrl, setupProblems } from "@/lib/setup-check";
import { statusPage, type StatusRow } from "@/lib/setup-page";
import { adminEmails } from "@/server/auth/admin-emails";

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
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "STATUS_TIMEOUT" })), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Can we log in to the database at all? Independent of the app's own setup (tables, demo data, secrets). */
async function ping(url: string) {
  const { default: postgres } = await import("postgres");
  const client = postgres(connectionUrl(url), { max: 1, connect_timeout: 15, idle_timeout: 1, prepare: false, onnotice: () => {} });
  try {
    await withTimeout(client`select 1`, 20_000);
    return null;
  } catch (e) {
    return e;
  } finally {
    await client.end({ timeout: 1 }).catch(() => {});
  }
}

/**
 * Setup checklist for the site owner: settings, database, demo data,
 * background jobs. It is public, so it answers yes or no: no secrets,
 * addresses, setting names, counts or times.
 */
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
  else if (secretProblem) {
    // The app's own database setup needs the secret, so only check the connection.
    const err = await ping(db.url);
    if (err) {
      const x = explain(err);
      rowsOut.push({ label: "Database", state: "problem", detail: x.detail, steps: x.steps });
    } else rowsOut.push({ label: "Database", state: "ok", detail: "Connected. Setup finishes once the secret key is set." });
  } else {
    try {
      const conn = await withTimeout(getDb(), 90_000);
      rowsOut.push({ label: "Database", state: "ok", detail: "Connected and set up." });
      try {
        const [u] = rows<{ found: boolean }>(await conn.execute(sql`select exists (select 1 from users) as found`));
        const [d] = rows<{ found: boolean }>(await conn.execute(sql`select exists (select 1 from settings where key = 'demo:loaded_on') as found`));
        const seedingOff = process.env.DEMO_AUTO_SEED === "false";
        rowsOut.push(
          u?.found
            ? { label: "Accounts", state: "ok", detail: d?.found ? "Demo patients, doctors and clinics are loaded." : "Accounts exist." }
            : env.demoMode && !seedingOff
              ? {
                  label: "Accounts",
                  state: "problem",
                  detail: "The database is empty: demo data didn't load.",
                  steps: ["Open Vercel → your project → Logs and look for lines starting with [db].", "Then redeploy."],
                }
              : { label: "Accounts", state: "info", detail: seedingOff ? "No accounts yet (loading demo data is turned off)." : "No accounts yet." },
        );
        const [admin] = rows<{ found: boolean }>(await conn.execute(sql`select exists (select 1 from users where role = 'super_admin') as found`));
        rowsOut.push(
          admin?.found
            ? { label: "Admin account", state: "ok", detail: "An admin account exists." }
            : adminEmails().length
              ? { label: "Admin account", state: "info", detail: "Not yet. Log in with your admin email (the one in ADMIN_EMAILS) and the account becomes the admin." }
              : {
                  label: "Admin account",
                  state: "problem",
                  detail: "No admin yet.",
                  steps: ["In Vercel → Settings → Environment Variables, add ADMIN_EMAILS with your email address, then redeploy.", "Then log in with that email (or with Google using that address)."],
                },
        );
        const [job] = rows<{ found: boolean }>(await conn.execute(sql`select exists (select 1 from settings where key = 'job:hourly') as found`));
        rowsOut.push({
          label: "Background jobs (reminders, refunds)",
          state: "info",
          detail: job?.found ? "Have run." : "Haven't run yet.",
          steps: process.env.VERCEL ? ["For reminders, set up a free job at cron-job.org that opens /api/cron/tick every 15 minutes with the header Authorization: Bearer <your CRON_SECRET>."] : undefined,
        });
      } catch (e) {
        const x = explain(e);
        rowsOut.push({ label: "Reading data", state: "problem", detail: x.detail, steps: x.steps });
      }
    } catch (e) {
      if ((e as { code?: string }).code === "STATUS_TIMEOUT") {
        rowsOut.push({ label: "Database", state: "problem", detail: "Still setting up the database, or it isn't answering (the first visit can take a minute).", steps: ["Reload this page in a minute."] });
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
