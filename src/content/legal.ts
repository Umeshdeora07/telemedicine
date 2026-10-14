import { brand } from "@/config/brand";

/**
 * Legal pages in plain language. These are starting templates written for
 * this product's actual behaviour; a lawyer must review them before launch.
 */
export type LegalDoc = { title: string; summary: string; updated: string; body: string };

const b = brand;
const sla = b.grievanceSla;

export const LEGAL: Record<string, LegalDoc> = {
  terms: {
    title: "Terms of use",
    summary: "The rules for using our website and app.",
    updated: "2026-10-01",
    body: `## Who we are
${b.name} is operated by ${b.legalEntity}, ${b.registeredAddress}. We run a platform that connects patients with independent, verified doctors and partner clinics. Doctors are responsible for the medical advice they give.

## Using the service
- You must be 18 or older to create an account. Children are seen with a parent or legal guardian.
- Give true information about yourself and the patient, including where the patient is during the consult. The patient's location decides which doctors may consult.
- Keep your login codes private. Tell us at once if you think someone else used your account.
- Don't use the service for emergencies. Call 112 in India or your local emergency number.

## Consults
- Online consults follow India's Telemedicine Practice Guidelines, 2020 for patients in India, and the rules of the patient's country elsewhere.
- The doctor decides whether a problem can be handled online. They may ask you to visit a clinic, get tests, or go to an emergency department.
- Some medicines cannot be prescribed online by law. The doctor will tell you if this applies.
- Consults are not recorded unless both you and the doctor agree in the consult.

## Payments
You pay when you book. We hold the payment and release it to the doctor after the consult. See the Refund policy for cancellations and refunds.

## Your content
You own the reports and messages you upload. You give us permission to store and share them only as needed to provide your care and as you choose.

## Limits of our responsibility
We verify doctors and clinics and run the platform carefully, but we do not practise medicine. To the extent the law allows, our liability is limited to the amount you paid for the service in question.

## Changes and disputes
We will tell you about important changes to these terms. These terms are governed by the laws of India, and courts in Bengaluru have jurisdiction, without affecting rights you have under the laws of your country.`,
  },
  privacy: {
    title: "Privacy policy",
    summary: "What we collect, why, who sees it, and your rights.",
    updated: "2026-10-01",
    body: `## In short
- We collect what's needed to give you care: your contact details, the patient's health information, and payment records.
- Your health records are encrypted. Doctors see them only for consults you book, or when you choose to share.
- We never sell your data. We don't use health data for advertising.
- You can download or delete your data at any time from Settings.

## What we collect
- **Account**: name, phone, email, country, language, time zone.
- **Health information** (sensitive personal data): symptoms, answers before a consult, reports you upload, consult notes, prescriptions, readings, reminders.
- **Consult data**: appointment details, chat messages, call quality data (not the audio or video, unless both sides agree to record).
- **Payment data**: amount, status, invoice. Card and UPI details are handled by our payment partners (Razorpay, Stripe), not stored by us.
- **Technical data**: device and browser type, IP address, and logs needed for security.

## Why we use it (purposes)
To provide consults and clinic visits; to send reminders and records; to process payments and refunds; to keep accounts safe; to meet legal duties (for example, keeping prescriptions and invoices); and, only if you agree, to improve care using anonymised data or to send you offers.

## Who we share it with
- The doctors and clinics you consult, and family members you allow.
- Interpreters you ask for, only during the consult.
- Service providers who process data for us under contract: cloud hosting in India, SMS/WhatsApp/email delivery, payment processing.
- Authorities, only when the law requires.

## Where it's stored
In India. If you are outside India, your data is transferred to India to provide the service; we protect it with the same safeguards.

## How long we keep it
Medical records and prescriptions: as long as the law requires (usually at least 3 years after the last consult), then deleted. Invoices: 8 years for tax law. Everything else: until you delete your account.

## Your rights
Under the Digital Personal Data Protection Act, 2023 (and GDPR for people in the EU/UK), you can: access your data; correct it; erase it; withdraw consent; nominate someone to act for you; and complain. Use Settings, or write to our Grievance Officer: ${b.grievanceOfficer.name}, ${b.grievanceOfficer.email}. If you are not satisfied, you can complain to the Data Protection Board of India (or your local regulator).

## Security
Encryption in transit and at rest, row-level access controls, two-step sign-in for doctors and staff, automatic sign-out on shared devices, and an access log of who viewed your records.`,
  },
  "telemedicine-consent": {
    title: "Telemedicine consent",
    summary: "What you agree to when you book an online consult.",
    updated: "2026-10-01",
    body: `By booking an online consult, you (or the person booking for you, with your permission) agree that:

1. The consult happens by video, audio or chat, and the doctor cannot examine you physically. Some problems can't be diagnosed online.
2. The doctor may ask you to visit a clinic, get tests, or go to a hospital emergency department. Please follow that advice.
3. The doctor will confirm your identity at the start, and a parent or guardian must be present for children.
4. Some medicines cannot be prescribed online. The doctor will only prescribe what is safe and allowed.
5. Your information is shared with the doctor for this consult. If you agree, the doctor can also see your past records for 30 days.
6. The consult is not recorded unless both you and the doctor agree during the consult.
7. Online consults are not for emergencies. If you have chest pain, trouble breathing, signs of a stroke, heavy bleeding, a severe allergic reaction or thoughts of harming yourself, get emergency help now.

You can withdraw this consent at any time by ending the consult.`,
  },
  refunds: {
    title: "Cancellation and refund policy",
    summary: "When you get your money back, and how fast.",
    updated: "2026-10-01",
    body: `## If the doctor doesn't join
If the doctor doesn't join within 10 minutes of the start time, the consult is cancelled and you get a **full refund automatically**. You can book another doctor straight away.

## If you cancel
- More than the free-cancellation window before the start (shown when you book): full refund.
- After that: a partial refund, as shown when you book.
- Rescheduling is free until the window shown when you book.

## If something goes wrong
If the call fails because of a problem on our side, or the doctor ends the consult early without good reason, contact us and we'll refund or rebook you.

## How refunds are paid
Back to the same card, UPI or bank account, usually within 5–7 working days. Pay-at-clinic visits are refunded at the clinic.

## Not refundable
Consults that took place as booked. Second opinions after the specialist has written the opinion.`,
  },
  grievance: {
    title: "Grievance redressal",
    summary: "How to complain, and our promise on response times.",
    updated: "2026-10-01",
    body: `We take every complaint seriously.

## How to complain
- Online: Help → Raise a complaint. You get a reference number.
- Email: ${b.grievanceOfficer.email}
- Phone: ${b.grievanceOfficer.phone} (${b.grievanceOfficer.hours})

## Our promise
- We acknowledge your complaint within **${sla.acknowledgeHours} hours**.
- We resolve it within **${sla.resolveDays} days**, and tell you what we did.

## Grievance Officer
${b.grievanceOfficer.name}
${b.legalEntity}, ${b.registeredAddress}

If you are not satisfied, you may approach the Data Protection Board of India (for privacy matters), the consumer forum, or the State Medical Council (for a doctor's professional conduct).`,
  },
  cookies: {
    title: "Cookie policy",
    summary: "The small files we use, and your choices.",
    updated: "2026-10-01",
    body: `## Essential cookies (always on)
- Sign-in session (so you stay logged in).
- Your language, currency, time zone and display settings (text size, contrast, dark mode).
- Security protections.

## Optional cookies (only if you agree)
- Anonymous usage statistics to improve the service.

We don't use advertising cookies. You can change your choice any time from the cookie notice or your browser settings.`,
  },
  "medical-disclaimer": {
    title: "Medical disclaimer",
    summary: "What our content is and isn't.",
    updated: "2026-10-01",
    body: `Articles, condition pages and the symptom checker give general health information. They are reviewed by doctors, but they are not a diagnosis or a treatment plan for you.

The symptom checker suggests how urgently to get help and which kind of doctor may help. It can be wrong. If you are worried, talk to a doctor.

**In an emergency, call 112 (India) or your local emergency number, or go to the nearest hospital.**`,
  },
};
