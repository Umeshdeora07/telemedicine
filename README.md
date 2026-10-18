# CareMitra: online consultations with Indian doctors, and treatment in India

A mobile first telemedicine website with two services:

- **Online consultation.** Patients anywhere in the world book a video, audio
  or chat consultation with a doctor registered in India, in four
  specialties: Orthopaedics, Dermatology, General Physician and Psychology.
  They get a digital prescription or a written treatment plan, and a free
  follow up chat.
- **Treatment in India.** Patients abroad send their reports for a free
  review, get a written treatment plan and cost estimate in their currency,
  a medical visa invitation letter, help with travel and stay, and online
  follow up after they return home.

It also has booking for parents and family, online to clinic visits, and
portals for doctors, clinics, care coordinators and admins. The site is in
English and Hindi, with a light theme by default and an optional dark theme.

"CareMitra" is a placeholder brand. Change it with `NEXT_PUBLIC_BRAND_NAME`
and the other `NEXT_PUBLIC_*` settings in `.env.example`.

> **Status:** feature-complete demo. Before real patients use it, work
> through the [launch checklist](#launch-checklist) — especially the legal
> review, payment and messaging accounts, and production secrets.

## Try it in your browser (no install)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/Umeshdeora07/telemedicine/tree/claude/eager-bohr-v7fs20)

1. Click the button (or on GitHub: **Code → Codespaces → Create codespace**).
2. Wait 3–5 minutes the first time while it installs and builds.
3. The site opens in a new tab. If it doesn't, open the **Ports** tab and
   click the globe next to port 3000.
4. Pick any demo account on the login page.

The codespace runs the production build in demo mode
(`.devcontainer/devcontainer.json`, `scripts/codespace-start.sh`) and reloads
the demo data once a day so "today's" appointments stay current. The address
is private to your GitHub account; to show someone else, right-click port
3000 in the Ports tab and set its visibility to Public.

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
| Sunita Rao | Patient | Diabetes review with a general physician |
| Arjun Nair | Caregiver in London | Booking for parents in Kochi, consented family access |
| Fatima Rahman | Patient in Dhaka | Treatment in India case, quotes, visa letter |
| Daniel Otieno | Patient in Nairobi | Online consultation paid in USD |
| Vikram Singh | Patient | Online consult that recommends a clinic visit |
| Dr. Kavita Sharma | Doctor (general physician) | Schedule, consult room, digital prescriptions |
| Dr. Harpreet Gill | Doctor (orthopaedics) | Treatment in India cases |
| Ira Banerjee | Clinical psychologist | Counselling consults (RCI registration, no medicines) |
| Nisha Malhotra | Hospital coordinator | Check in by QR, visits, treatment in India cases |
| Ravi Kumar | Care coordinator | Callbacks, assisted booking, interpreters |
| Aditi Rao | Super admin | Verification, payments, complaints, audit log |

The accounts are in the "Test accounts" panel at the bottom of the login
page, which only appears in demo mode. Staff accounts use two factor
authentication. In demo mode the two factor screen shows the current code.

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
- **Tailwind CSS v4** with design tokens in `src/app/globals.css`. The
  site is light by default; the sun and moon button in the header switches
  to dark (saved in the `pref_theme` cookie). Both themes meet WCAG 2.2 AA
  colour contrast. There are no other display settings.
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
  bookings, refunds doctor no-shows, sends 24 h / 1 h / 10 min reminders,
  delivers notifications, generates slots, and checks registration expiry. It starts with the Node.js server (`src/instrumentation.ts`)
  or can be called at `POST /api/cron/tick`.
- **PWA**: installable, offline visit pass and prescriptions, Web Push
  (`public/sw.js`).
- **i18n**: two languages, English and Hindi. English source strings with
  Hindi dictionaries in `src/i18n/dictionaries/`. The header has a one tap
  switch to the other language. `npm run i18n:check -- hi` lists missing
  Hindi strings.
- **Photos**: site photos are listed in `src/config/images.ts` (free Pexels
  photos). Replace any `src` with your own file under `public/images/site/`.
  Doctors show their own uploaded photo, or their initials.

```
src/
  app/            routes: (site) public pages, (auth), (flow) booking and
                  payment, (patient) patient app, (room) consult room,
                  doctor/, clinic/, coordinator/, admin/, api/
  components/     UI kit (ui/) and feature components
  server/         business logic, server actions, auth, payments, notifications
  db/             schema, connection, RLS helper, demo seed
  lib/            pricing and GST, TPG rules, red flag symptoms, time zones, crypto, PDFs
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

### Free demo: Vercel (website) + Neon (database)

The free plans suit a demo with sample data only: Vercel's Hobby plan is
for non-commercial use, Neon's closest region to India is Singapore, and
uploaded files are temporary. Keep `DEMO_MODE=true` and no real patients.

1. Make two random strings of 32+ characters (a password manager's
   generator): one for `APP_SECRET`, one for `CRON_SECRET`. Keep them safe;
   changing `APP_SECRET` later makes stored files and signatures invalid.
2. Vercel → Add New → Project → import this repository. Before deploying,
   add environment variables: `APP_SECRET`, `CRON_SECRET`,
   `DEMO_MODE=true`, and optionally `DEMO_ACCESS_PASSWORD` (a password for
   the whole site). Deploy. Until a database is connected the site shows a
   "needs setting up" page listing what's missing.
3. Project → Storage → Create Database → Neon, region Singapore
   (aws-ap-southeast-1), Free plan → connect it to the project for all
   environments. This sets `DATABASE_URL` (pooled; works as is).
4. Deployments → ⋯ → Redeploy. The first visit creates the tables and loads
   the demo data (about a minute). `/status` shows a checklist (secret key,
   database, demo data, background jobs) with what to fix for any red cross.
5. Background jobs: `vercel.json` runs them daily (the most Hobby allows).
   For reminders and no-show refunds, add a free job at cron-job.org:
   GET `https://<your-site>/api/cron/tick` with header
   `Authorization: Bearer <CRON_SECRET>`, every 15 minutes (every minute
   keeps Neon's free database awake and uses up its monthly hours).

`vercel.json` pins functions to Singapore (`sin1`), next to the database.
The public address comes from Vercel; set `APP_URL` only for a custom domain.

### Go live without sample data (doctors join themselves)

With `DEMO_MODE=false` the site has no sample doctors or patients. On the
next start after switching it off, the demo data that demo mode loaded is
removed automatically (only from a database that demo mode filled), and the
four specialties are kept. Doctors then join like this:

1. A doctor opens **For doctors → Join as a doctor**, logs in and applies in
   one of the four specialties.
2. They set up two step verification (an authenticator app such as Google
   Authenticator), then fill in every required detail: qualifications and
   degree certificate, Indian registration (NMC, a State Medical Council, or
   RCI for psychologists) and its certificate, government ID and selfie,
   profile photo, a few lines about themselves, languages, video fee,
   available times and signature. Only then can they submit.
3. The admin opens **Admin → Verification**, checks the documents and the
   registration with the council, marks the registration verified and
   approves the doctor. Patients see only approved doctors, and only the
   public details (photo, name, specialty, qualifications, experience,
   languages, registration number, about, fee, available times, reviews).
   ID, selfie and certificates stay private.

Uploaded files are stored encrypted in the database on Vercel (its disk is
temporary), so they survive redeploys. Each file can be up to 4 MB there.

**Steps in Vercel** (Settings → Environment Variables, then Redeploy):

1. `ADMIN_EMAILS`: your email address (several, separated by commas). The
   first time you log in with that address, the account becomes the admin.
2. A way to log in. Without one, the site works but nobody can log in.
   - **Log in with Google** (free, recommended): go to
     console.cloud.google.com → create a project → "APIs & Services" →
     "OAuth consent screen" (External, add your app name and email, then
     publish it) → "Credentials" → "Create credentials" → "OAuth client
     ID" → Web application. Under "Authorised redirect URIs" add
     `https://<your-site>/api/auth/oauth/google/callback`. Copy the client
     ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
   - Or email codes with Resend: `RESEND_API_KEY` and `EMAIL_FROM` (needs
     your own domain verified in Resend).
3. `DEMO_MODE=false`.
4. Redeploy, open `/status` to check, then log in with your admin email.

**Payments go straight to each doctor.** Every doctor adds their own fees
(consultation fees per call type, plus a list of treatment and other fees)
and their own payment details (UPI ID, UPI QR code, bank account, SWIFT for
patients abroad) under Doctor → Profile and fees. When a patient books, they
see that doctor's details, pay the doctor directly, and enter the payment
reference (UTR). The doctor confirms the payment under Doctor → Payments and
the booking is confirmed; if the money did not arrive, the doctor says so
and the time is freed. Refunds (for example when a doctor does not join) are
listed for the doctor to send back and mark as sent. Bank details are never
shown on public pages, only to the patient paying for a booking. Razorpay or
Stripe (see `.env.example`) are only used for doctors who have not added
payment details.

### Production: your own server in India

For real patients, use a host in India with durable storage, e.g. a
DigitalOcean Bangalore droplet running `docker-compose.yml` (app,
PostgreSQL and HTTPS), or with DigitalOcean Managed PostgreSQL and a block
storage volume for `STORAGE_DIR`. On a single server:

1. Point your domain at the server; `cp .env.example .env` and set
   `DOMAIN`, `POSTGRES_PASSWORD`, `APP_SECRET` and the `NEXT_PUBLIC_*`
   brand and grievance details; keep `DEMO_MODE=false`.
2. `docker compose up -d --build` (build needs ~2 GB RAM; add swap on
   smaller servers). Migrations run on start; HTTPS is automatic.
3. Configure payment webhooks: `$APP_URL/api/webhooks/razorpay` and
   `$APP_URL/api/webhooks/stripe`.
4. Back up the `pgdata` and `uploads` volumes every night, off the server,
   and test a restore.

Any other Node.js host works too (`npm run build && npm start`) with
PostgreSQL 15+, `DATABASE_URL`, `APP_SECRET`, `APP_URL` and durable storage
for `STORAGE_DIR`. On serverless hosts set `DISABLE_INTERNAL_SCHEDULER=1`
and call `/api/cron/tick` every minute with `Authorization: Bearer
$CRON_SECRET`. Background jobs and migrations take database locks, so
several instances are safe. Health check: `GET /api/health`.

The database user needs CREATEROLE (the default on Neon, Render, Supabase,
RDS and DigitalOcean): the row-level security migration creates the
`app_rls` role.

## Compliance notes

The app is built around Indian and international rules, but software alone
does not make a service compliant. What is in place:

- **Telemedicine Practice Guidelines 2020** — doctor registration shown on
  profiles and prescriptions, patient identity and consent at the start of
  each consult, prescription rules by consult type (List O, A, B and
  prohibited medicines), digital prescriptions with all required fields.
- **Registration**: every consultation is given by a doctor registered in
  India (National Medical Commission or a State Medical Council;
  psychologists with the Rehabilitation Council of India) under India's
  telemedicine rules, wherever the patient lives. Doctors are listed only
  with a verified, unexpired Indian registration, checked again every 12
  months. Patients outside India are told that a prescription from an
  Indian doctor may not be accepted by pharmacies in their country, and
  get a written treatment plan to share with their local doctor.
- **DPDP Act 2023 / GDPR** — consent records, cookie choices, data export
  (`/api/me/export`), deletion requests, a grievance officer and complaint
  tracking with deadlines.
- **Security** — row-level security for medical records, encryption at rest
  for files and passport numbers, audit log of record access, two-factor
  authentication and short idle logout for staff, signed prescriptions,
  hashed tokens, strict security headers, and browser data cleared on
  logout.
- **Emergencies**: the service is not for emergencies, as the footer and
  help page say. Red flag symptoms in the booking form tell patients to go
  to the nearest hospital or call their local emergency number instead.

## Launch checklist

- [ ] Choose the brand name and replace every `NEXT_PUBLIC_*` placeholder.
      The footer hides contact and company details until they are real.
- [ ] Replace the site photos in `src/config/images.ts` with your own if you
      wish, and upload each doctor's own photo.
- [ ] Have a lawyer review and complete the legal pages in
      `src/content/legal.ts` (terms, privacy, telemedicine consent, refunds,
      grievance, cookies, medical disclaimer).
- [ ] Appoint a Grievance Officer and publish their details.
- [ ] Confirm the GST treatment of consultation fees, the platform fee and
      payments from abroad with a tax adviser.
- [ ] Have a doctor verify the medicine lists in `src/lib/tpg.ts` and the
      red flag symptoms in `src/lib/triage.ts`.
- [ ] Verify every doctor's registration with the NMC or State Medical
      Council, and every psychologist's with the RCI.
- [ ] Open live Razorpay and Stripe accounts and set up webhooks.
- [ ] Finish Razorpay checkout for treatment in India deposits (today only
      consult bookings complete a Razorpay payment).
- [ ] Move off free plans: Vercel Hobby is for non-commercial use, and
      patient data should stay in India (see Deploying → Production).
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
