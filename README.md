# CareMitra — telemedicine for India and families abroad

A mobile-first telemedicine web app: video, audio and chat consultations with
licensed doctors, booking for parents from abroad, hybrid online-to-clinic
visits, a treatment-in-India journey for international patients, and portals
for doctors, clinics, care coordinators and admins.

"CareMitra" is a placeholder brand. Change it with `NEXT_PUBLIC_BRAND_NAME`
and the other `NEXT_PUBLIC_*` settings in `.env.example`.

> **Status:** feature-complete demo. Before real patients use it, work
> through the [launch checklist](#launch-checklist) — especially the legal
> review, payment and messaging accounts, and production secrets.

## Quick start

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. On first start the app creates an embedded
PostgreSQL database (PGlite) in `.data/`, applies migrations and loads demo
data. Nothing else is needed: OTP codes appear on screen and payments use a
test page.

On the login page, pick any demo account:

| Account | Role | Shows |
|---|---|---|
| Asha Verma | Patient, 62 | Hindi interface, upcoming video consult |
| Rahul Mehta | Patient | Family profiles (wife and son) |
| Sunita Rao | Patient | Diabetes care plan, home readings chart, medicine reminders |
| Arjun Nair | Caregiver in London | Booking for parents in Kochi, consented family access |
| Fatima Rahman | International patient, Dhaka | Treatment-in-India case, quotes, visa letter |
| John Carter | Patient in New York | Licence gating: only NY-licensed doctors |
| Vikram Singh | Patient | Online consult that recommends a clinic visit |
| Dr. Kavita Sharma | Doctor | Schedule, consult room, e-prescriptions |
| Dr. Rajesh Iyer | Doctor (cardiology) | Licensed in India and NY/NJ |
| Nisha Malhotra | Clinic coordinator | Check-in by QR, visits, international cases |
| Ravi Kumar | Care coordinator | Callbacks, assisted booking, interpreters |
| Aditi Rao | Super admin | Verification, payments, complaints, audit log |

Staff accounts use two-factor authentication. In demo mode the two-factor
screen shows the current code.

To start over with fresh demo data:

```bash
npm run db:reset
```

Only one process can open the embedded database. Stop the dev server before
running `db:*` scripts or tests.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` / `npm run typecheck` | ESLint and TypeScript |
| `npm test` | Unit and integration tests (Vitest; integration tests use a temporary embedded database) |
| `npm run test:e2e` | End-to-end and accessibility tests (Playwright + axe). Starts the dev server unless `BASE_URL` is set |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Load demo data into an empty database |
| `npm run db:reset` | Delete everything and reload demo data (refuses on PostgreSQL unless `ALLOW_DB_RESET=true`) |
| `npm run db:generate` | Generate a migration after editing `src/db/schema.ts` |
| `npm run keys` | Print production secrets (encryption, signing, hashing, cron) |
| `npm run i18n:check` | List strings missing from a translation |

If the dev server stops picking up edits (some container file systems drop
watch events), restart it with `NEXT_WATCH_POLL_MS=1000 npm run dev`. If it
reloads in a loop after an upgrade, delete `.next/` and restart.

## Architecture

- **Next.js 16 App Router** with React 19 Server Components and Server
  Actions. Route protection and security headers in `src/proxy.ts`.
- **Tailwind CSS v4** with design tokens in `src/app/globals.css`
  (light and dark themes, WCAG 2.2 AA contrast).
- **Drizzle ORM on PostgreSQL.** PGlite (embedded) locally; set
  `DATABASE_URL` for a real server. Schema in `src/db/schema.ts`,
  migrations in `drizzle/`.
- **Row-level security** (`drizzle/0001_rls.sql`). Requests that touch
  medical data run in `withRls()`, which switches to a non-owner role and
  sets the user and role for the transaction, so the database itself
  decides which notes, prescriptions and documents a user may see.
- **Video** is WebRTC, peer to peer, with signalling over HTTP polling
  stored in the database (works on serverless). Audio-only and low-data
  modes, live captions (browser speech recognition), interpreter and
  family member seats.
- **Files** are encrypted with AES-256-GCM before they are written
  (`src/lib/storage.ts`). Prescriptions are signed with Ed25519 and carry a
  verification QR code.
- **Scheduler** (`src/server/jobs.ts`) runs every minute: expires unpaid
  bookings, refunds doctor no-shows, sends 24 h / 1 h / 10 min reminders and
  medicine reminders, delivers notifications, generates slots, and checks
  licence expiry. It starts with the Node.js server (`src/instrumentation.ts`)
  or can be called at `POST /api/cron/tick`.
- **PWA**: installable, offline visit pass and prescriptions, Web Push
  (`public/sw.js`).
- **i18n**: English source strings with dictionaries in `src/i18n/`.
  Patient-facing screens are translated into Hindi; staff portals are in
  English.

```
src/
  app/            routes: (site) public pages, (auth), (flow) booking and
                  payment, (patient) patient app, (room) consult room,
                  doctor/, clinic/, coordinator/, admin/, api/
  components/     UI kit (ui/) and feature components
  server/         business logic, server actions, auth, payments, notifications
  db/             schema, connection, RLS helper, demo seed
  lib/            pricing and GST, TPG rules, triage, time zones, crypto, PDFs
  content/        legal page templates
  i18n/           locale config and dictionaries
tests/            Vitest unit and integration tests
e2e/              Playwright journeys and accessibility scans
```

## Configuration

Copy `.env.example` to `.env.local` and fill in what you need. Every
setting is optional for a local demo. The main groups:

- **Mode** — `DEMO_MODE` (on by default in development, off in production)
  and `APP_URL`.
- **Database and files** — `DATABASE_URL`, `STORAGE_DIR`.
- **Secrets** — `DATA_ENCRYPTION_KEY`, `SIGNING_PRIVATE_KEY`,
  `SIGNING_PUBLIC_KEY`, `HASH_SECRET` (required in production; generate
  with `npm run keys`).
- **Payments** — Razorpay for India (UPI, cards, net banking, wallets) and
  Stripe for international cards. Without them a test payment page is used,
  in demo mode only.
- **Messages** — Twilio SMS, WhatsApp Business Cloud API, Resend email and
  Web Push (VAPID). Without them messages are written to the server log.
- **Video** — `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL`. A TURN server
  is needed for calls on strict mobile and office networks.
- **Business rules** — platform fee, GST rate and state, doctor commission,
  no-show window, idle logout times.

## Deploying

The app runs as a standard Node.js server (`npm run build && npm start`)
on any host with PostgreSQL 15+.

1. Provision PostgreSQL (ideally in an Indian region) and durable encrypted
   storage for `STORAGE_DIR`.
2. Set `DATABASE_URL`, `APP_URL`, the secrets from `npm run keys`, and
   `DEMO_MODE=false`.
3. Run `npm run db:migrate` (or leave `DB_AUTO_MIGRATE` on).
4. Configure payment webhooks: `$APP_URL/api/webhooks/razorpay` and
   `$APP_URL/api/webhooks/stripe`.
5. On serverless hosting, set `DISABLE_INTERNAL_SCHEDULER=1` and call
   `POST /api/cron/tick` every minute with
   `Authorization: Bearer $CRON_SECRET`.
6. Health check: `GET /api/health`.

Run a single scheduler: either one long-running server, or the cron
endpoint, not several servers each with their own internal scheduler.
Notifications are de-duplicated, but one scheduler keeps the load and logs
predictable.

## Compliance notes

The app is built around Indian and international rules, but software alone
does not make a service compliant. What is in place:

- **Telemedicine Practice Guidelines 2020** — doctor registration shown on
  profiles and prescriptions, patient identity and consent at the start of
  each consult, prescription rules by consult type (List O, A, B and
  prohibited medicines), e-prescriptions with all required fields.
- **Licensing** — doctors appear only to patients in places where they hold
  an active, verified licence. Licences expire automatically and the doctor
  is reminded before they do.
- **DPDP Act 2023 / GDPR** — consent records, cookie choices, data export
  (`/api/me/export`), deletion requests, a grievance officer and complaint
  tracking with deadlines.
- **Security** — row-level security for medical records, encryption at rest
  for files and passport numbers, audit log of record access, two-factor
  authentication and short idle logout for staff, signed prescriptions,
  hashed tokens, strict security headers, and browser data cleared on
  logout.
- **Emergencies** — a red-flag symptom check before booking directs
  patients to emergency services instead of a video call.

## Launch checklist

- [ ] Choose the brand name and replace every `NEXT_PUBLIC_*` placeholder.
- [ ] Have a lawyer review and complete the legal pages in
      `src/content/legal.ts` (terms, privacy, telemedicine consent, refunds,
      grievance, cookies, medical disclaimer).
- [ ] Appoint a Grievance Officer and publish their details.
- [ ] Confirm the GST treatment of consultation fees, the platform fee and
      payments from abroad with a tax adviser.
- [ ] Have a doctor verify the medicine lists in `src/lib/tpg.ts` and the
      red-flag symptoms in `src/lib/triage.ts`.
- [ ] Verify every doctor's registration with the NMC or State Medical
      Council, and every foreign licence with the issuing board.
- [ ] Open live Razorpay and Stripe accounts and set up webhooks.
- [ ] Register SMS sender ID and DLT templates, WhatsApp message templates,
      and a sending domain for email.
- [ ] Run a TURN server.
- [ ] Generate production secrets with `npm run keys` and back them up.
- [ ] Set `DEMO_MODE=false` and start from an empty database (no demo data).
- [ ] Apply to ABDM before using ABHA linking with real accounts.
- [ ] Decide how long to keep consult recordings, if you enable them, and
      say so in the privacy policy.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test` and
      `npm run test:e2e` against the production build.
