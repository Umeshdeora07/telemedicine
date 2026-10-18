/**
 * Settings checks that need no database, cheap enough to run on every request.
 * When something essential is missing the proxy shows a "Setup needed" page
 * that says what to do, instead of a bare server error; /status shows the
 * same plus live database checks.
 */
import { env } from "@/config/env";

export type SetupProblem = { id: string; title: string; steps: string[] };

/** Prefixes of database settings added by Vercel's storage integrations (e.g. STORAGE in STORAGE_DATABASE_URL). */
function databasePrefixes() {
  const prefixes = new Set<string>();
  for (const [k, v] of Object.entries(process.env)) {
    const m = v ? /^(.+)_(DATABASE_URL|POSTGRES_URL)$/.exec(k) : null;
    if (m) prefixes.add(m[1]);
  }
  return [...prefixes].sort();
}

/**
 * The PostgreSQL connection string, and the name of the setting it came from:
 * DATABASE_URL, POSTGRES_URL, or the one prefixed pair Vercel adds when a
 * database is connected with a custom prefix (e.g. STORAGE_DATABASE_URL).
 * With several prefixed databases and no DATABASE_URL it returns null rather
 * than guess, and setupProblems() asks the owner to choose.
 */
export function databaseUrl(): { url: string; name: string } | null {
  const vars = process.env;
  const named = ["DATABASE_URL", "POSTGRES_URL"].find((k) => vars[k]);
  if (named) return { url: vars[named]!, name: named };
  const prefixes = databasePrefixes();
  if (prefixes.length !== 1) return null;
  const name = [`${prefixes[0]}_DATABASE_URL`, `${prefixes[0]}_POSTGRES_URL`].find((k) => vars[k])!;
  return { url: vars[name]!, name };
}

const hasExplicitKeys = () =>
  Boolean(process.env.DATA_ENCRYPTION_KEY && process.env.SIGNING_PRIVATE_KEY && process.env.SIGNING_PUBLIC_KEY && process.env.HASH_SECRET);

const onVercel = () => Boolean(process.env.VERCEL);

const redeploy = onVercel()
  ? "Redeploy: open the Deployments tab, click ⋯ next to the newest deployment, choose Redeploy."
  : "Restart the site so it picks up the change.";

const settingsPlace = onVercel()
  ? "In Vercel, open your project → Settings → Environment Variables."
  : "Open the site's settings (the .env file or your host's environment variables).";

/** Problems that stop the site from working, in the order to fix them. */
export function setupProblems(): SetupProblem[] {
  const problems: SetupProblem[] = [];
  const db = databaseUrl();

  if (!hasExplicitKeys()) {
    const secret = process.env.APP_SECRET;
    if (!secret && (onVercel() || db || !env.demoMode)) {
      problems.push({
        id: "secret-missing",
        title: "The secret key (APP_SECRET) is missing",
        steps: [
          settingsPlace,
          "Add a setting named APP_SECRET whose value is a long random text of 32 or more letters and numbers (a password generator works).",
          "Keep it safe and never change it later: the site's stored files and signed prescriptions depend on it.",
          redeploy,
        ],
      });
    } else if (secret && secret.length < 32) {
      problems.push({
        id: "secret-short",
        title: "The secret key (APP_SECRET) is too short",
        steps: [settingsPlace, "Make APP_SECRET at least 32 characters long.", redeploy],
      });
    }
  }

  const prefixes = databasePrefixes();
  if (!db && prefixes.length > 1) {
    problems.push({
      id: "database-ambiguous",
      title: "More than one database is connected",
      steps: [
        settingsPlace,
        `Several database settings exist (${prefixes.map((p) => `${p}_DATABASE_URL`).join(", ")}). Add a setting named DATABASE_URL and paste in the value of the one this site should use.`,
        redeploy,
      ],
    });
  } else if (!db && onVercel()) {
    problems.push({
      id: "database-missing",
      title: "No database is connected",
      steps: [
        "In Vercel, open your project and click the Storage tab.",
        "Click Create Database, choose Neon, pick the region Singapore and the Free plan, and create it.",
        "When asked, connect it to this project and tick Production, Preview and Development.",
        redeploy,
      ],
    });
  }

  const canSignIn =
    env.demoMode ||
    Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) ||
    Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM) ||
    Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
    Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
  if (!canSignIn) {
    problems.push({
      id: "no-sign-in",
      title: "Nobody can log in yet",
      steps: [
        "The easiest way is Google sign in (free): see README, section \"Log in with Google\". It needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        "Or connect an email service (Resend: RESEND_API_KEY and EMAIL_FROM) or a text message service (Twilio) so login codes can be sent.",
        settingsPlace,
        redeploy,
      ],
    });
  }
  return problems;
}
