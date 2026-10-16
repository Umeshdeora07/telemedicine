/**
 * Settings checks that need no database, cheap enough to run on every request.
 * When something essential is missing the proxy shows a "Setup needed" page
 * that says what to do, instead of a bare server error; /status shows the
 * same plus live database checks.
 */
import { env } from "@/config/env";

export type SetupProblem = { id: string; title: string; steps: string[] };

/**
 * The PostgreSQL connection string, and the name of the setting it came from.
 * Besides DATABASE_URL this accepts the names Vercel's storage integrations
 * use, including a custom prefix chosen when connecting (e.g. STORAGE_DATABASE_URL).
 */
export function databaseUrl(): { url: string; name: string } | null {
  const vars = process.env;
  const named = ["DATABASE_URL", "POSTGRES_URL"].find((k) => vars[k]);
  if (named) return { url: vars[named]!, name: named };
  const keys = Object.keys(vars).sort();
  const prefixed =
    keys.find((k) => k.endsWith("_DATABASE_URL") && vars[k]) ??
    keys.find((k) => k.endsWith("_POSTGRES_URL") && vars[k]) ??
    keys.find((k) => k.endsWith("_DATABASE_URL_UNPOOLED") && vars[k]);
  return prefixed ? { url: vars[prefixed]!, name: prefixed } : null;
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
        steps: [settingsPlace, `Make APP_SECRET at least 32 characters long (it is ${secret.length} now).`, redeploy],
      });
    }
  }

  if (!db && onVercel()) {
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
    Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  if (!canSignIn) {
    problems.push({
      id: "no-sign-in",
      title: "Nobody can log in yet",
      steps: [
        settingsPlace,
        "For a demo with sample patients and doctors, add DEMO_MODE with the value true.",
        "For real use instead, connect an SMS service (Twilio) or an email service (Resend) so login codes can be sent.",
        redeploy,
      ],
    });
  }
  return problems;
}
