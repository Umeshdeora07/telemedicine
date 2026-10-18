import { brand } from "@/config/brand";
import { company, grievance } from "@/components/support/brand-info";

/**
 * Legal pages in plain language. These are starting templates written for
 * this product's actual behaviour; a lawyer must review them before launch.
 * Company and grievance officer details appear only once they are filled in
 * (see src/config/brand.ts).
 */
export type LegalDoc = { title: string; summary: string; updated: string; body: string };

const b = brand;
const lines = (...xs: (string | null | false | undefined)[]) => xs.filter(Boolean).join("\n");

const operator =
  company.legalEntity && company.registeredAddress
    ? `${b.name} is operated by ${company.legalEntity}, ${company.registeredAddress}.`
    : company.legalEntity
      ? `${b.name} is operated by ${company.legalEntity}.`
      : `This website is run by ${b.name}.`;

const officerContact = lines(
  grievance.name ? `- Name: ${grievance.name}` : null,
  grievance.email ? `- Email: ${grievance.email}` : null,
  grievance.phone ? `- Phone: ${grievance.phone} (${grievance.hours})` : null,
  company.legalEntity && company.registeredAddress ? `- Address: ${company.legalEntity}, ${company.registeredAddress}` : null,
);

const writeToOfficer = grievance.email ? `write to our Grievance Officer at ${grievance.email}` : "contact our Grievance Officer through Help, then Raise a complaint";

const EMERGENCY = "This service is not for emergencies. In an emergency, go to the nearest hospital or call your local emergency number (112 in India).";

const OUTSIDE_INDIA =
  "Your doctor is registered in India. If you live outside India, a prescription from an Indian doctor may not be accepted by pharmacies in your country. Your doctor will give you a written treatment plan that you can share with your local doctor.";

export const LEGAL: Record<string, LegalDoc> = {
  terms: {
    title: "Terms of use",
    summary: "The rules for using our website and services.",
    updated: "2026-10-17",
    body: `## Who we are
${operator} We run a platform that connects patients anywhere in the world with independent, verified doctors registered in India, for online consultations. We also help patients who choose to travel to India for treatment. Doctors are responsible for the medical advice they give, and hospitals are responsible for the treatment they provide.

## Using the service
- You must be 18 or older to create an account. Children are seen with a parent or legal guardian present.
- Give true and complete information about yourself and about the patient.
- Keep your login codes private. Tell us at once if you think someone else has used your account.
- ${EMERGENCY}

## Online consultations
- Every doctor on ${b.name} is registered in India with the National Medical Commission or a State Medical Council. Clinical psychologists are registered with the Rehabilitation Council of India.
- Consultations follow India's Telemedicine Practice Guidelines, 2020, wherever the patient lives.
- The doctor decides whether a problem can be handled online. They may ask you to see a doctor in person, get tests, or go to a hospital.
- Some medicines cannot be prescribed online under Indian law. The doctor will tell you if this applies.
- ${OUTSIDE_INDIA}
- Consultations are not recorded unless both you and the doctor agree during the consultation.

## Treatment in India
- We review your reports with a specialist and send you a written treatment plan and cost estimate. You are under no obligation.
- A cost estimate is a guide, not a final bill. The hospital bills in Indian rupees, and the final cost depends on your condition and the treatment you receive.
- We help you choose a hospital that suits your treatment and budget. You can check its accreditation, such as NABH or JCI, yourself before you decide. The hospital is responsible for your treatment.
- We can arrange a medical visa invitation letter, airport pickup, a place to stay, an interpreter and online follow up after you return home. The decision to grant a visa rests with the Government of India.

## Payments
You pay when you book, and you see the full price before you pay. Each doctor sets their own consultation and treatment fees. Most doctors are paid directly: you pay the doctor's own UPI or bank account shown when you book, enter the payment reference, and the booking is confirmed when the doctor receives the money. Where online card payment is offered, we hold the payment and release it to the doctor after the consultation. See the Cancellation and refund policy for cancellations and refunds.

## Your content
You own the reports and messages you upload. You allow us to store them and to share them only as needed to provide your care, and as you choose.

## Limits of our responsibility
We verify doctors and run the platform with care, but we do not practise medicine. To the extent the law allows, our liability is limited to the amount you paid for the service in question.

## Changes and disputes
We will tell you about important changes to these terms. These terms are governed by the laws of India, and courts in Bengaluru have jurisdiction. This does not affect rights you have under the laws of your country.`,
  },
  privacy: {
    title: "Privacy policy",
    summary: "What we collect, why, who sees it, and your rights.",
    updated: "2026-10-17",
    body: `## In short
- We collect what is needed to give you care: your contact details, the patient's health information, and payment records.
- Your health records are encrypted. Doctors see them only for consultations you book, or when you choose to share them.
- We never sell your data, and we do not use health data for advertising.
- You can download or delete your data at any time from Settings.

## What we collect
- **Account**: name, phone, email, country, language and time zone.
- **Health information** (sensitive personal data): symptoms, your health form before a consultation, reports you upload, consultation notes and prescriptions.
- **Treatment in India requests**: the reports you send, the treatment plan and cost estimate, and travel details you give us. If a visa letter is issued, your passport number is stored encrypted.
- **Consultation data**: appointment details, chat messages and call quality data. The audio and video are not recorded unless both sides agree.
- **Payment data**: amount, status and invoice. Card and UPI details are handled by our payment partners, not stored by us.
- **Technical data**: device and browser type, IP address, and the logs we need for security.

## Why we use it
To provide online consultations and clinic visits; to review reports and prepare treatment plans; to arrange travel and visa letters when you ask; to send you reminders and records; to process payments and refunds; to keep accounts safe; to meet legal duties, such as keeping prescriptions and invoices; and, only if you agree, to improve care using anonymised data or to send you offers.

## Who we share it with
- The doctors you consult, and the family members you allow.
- For treatment in India, the specialist who reviews your reports and the hospital you choose.
- Interpreters you ask for, only during the consultation.
- Service providers who process data for us under contract: cloud hosting in India, text message, WhatsApp and email delivery, and payment processing.
- Authorities, only when the law requires it.

## Where it is stored
In India. If you live outside India, your data is transferred to India to provide the service, and we protect it with the same safeguards.

## How long we keep it
Medical records and prescriptions are kept for as long as the law requires, usually at least 3 years after the last consultation, and then deleted. Invoices are kept for 8 years under tax law. Everything else is kept until you delete your account.

## Your rights
Under India's Digital Personal Data Protection Act, 2023, and the GDPR for people in the EU and UK, you can access your data, correct it, erase it, withdraw consent, nominate someone to act for you, and complain. Use Settings, or ${writeToOfficer}. If you are not satisfied, you can complain to the Data Protection Board of India or your local regulator.

## Security
Encryption in transit and at rest, strict access controls, two step verification for doctors and staff, automatic sign out on shared devices, and a log of who viewed your records.`,
  },
  "telemedicine-consent": {
    title: "Telemedicine consent",
    summary: "What you agree to when you book an online consultation.",
    updated: "2026-10-17",
    body: `By booking an online consultation, you, or the person booking for you with your permission, agree that:

1. The consultation happens by video, audio or chat, and the doctor cannot examine you in person. Some problems cannot be diagnosed online.
2. Your doctor is registered in India and consults under India's Telemedicine Practice Guidelines, 2020, wherever you live.
3. The doctor may ask you to see a doctor in person, get tests, or go to a hospital. Please follow that advice.
4. The doctor will confirm your identity at the start, and a parent or guardian must be present for children.
5. Some medicines cannot be prescribed online. The doctor will only prescribe what is safe and allowed. ${OUTSIDE_INDIA}
6. Your information is shared with the doctor for this consultation. If you agree, the doctor can also see your past records for 30 days.
7. The consultation is not recorded unless both you and the doctor agree during the consultation.
8. Online consultations are not for emergencies. If you have chest pain, trouble breathing, signs of a stroke, heavy bleeding, a severe allergic reaction or thoughts of harming yourself, go to the nearest hospital or call your local emergency number now.

You can withdraw this consent at any time by ending the consultation.`,
  },
  refunds: {
    title: "Cancellation and refund policy",
    summary: "When you get your money back, and how fast.",
    updated: "2026-10-17",
    body: `## If the doctor does not join
If your doctor does not join within 10 minutes of the start time, the consultation is cancelled and you get a **full refund**. You can book another doctor straight away.

## If you cancel
- If you cancel before the cancellation deadline shown when you book, you get a full refund.
- If you cancel after that time, you get a partial refund, as shown when you book.
- You can change the time until the deadline shown when you book.

## If something goes wrong
If the call fails because of a problem on our side, or the doctor ends the consultation early without good reason, contact us and we will refund you or book you again.

## How refunds are paid
Refunds go back to the same card, UPI or bank account, usually within 5 to 7 working days. Clinic visits paid at the clinic are refunded at the clinic.

If you paid the doctor directly by UPI or bank transfer, the doctor sends the refund back to you the same way. We record every refund that is due and follow up with the doctor until it reaches you. If it does not arrive within 7 working days, contact us or our grievance officer.

If you paid a doctor directly and the doctor says the money did not arrive, the booking is cancelled and the time is freed. If you did pay, contact us with your payment reference and we will help you sort it out with the doctor.

## Treatment in India
If you accept a plan and pay a deposit, the deposit and any refund of it follow the terms shown in your treatment plan before you pay.

## Not refundable
Consultations that took place as booked.`,
  },
  grievance: {
    title: "Grievance redressal",
    summary: "How to complain, and our promise on response times.",
    updated: "2026-10-17",
    body: lines(
      "We take every complaint seriously.",
      "",
      "## How to complain",
      "- Online: go to Help, then Raise a complaint. You get a reference number to track it.",
      grievance.email ? `- Email: ${grievance.email}` : null,
      grievance.phone ? `- Phone: ${grievance.phone} (${grievance.hours})` : null,
      "",
      "## Our promise",
      `- We acknowledge your complaint within **${grievance.acknowledgeHours} hours**.`,
      `- We resolve it within **${grievance.resolveDays} days**, and tell you what we did.`,
      "",
      "## Grievance Officer",
      "Our Grievance Officer oversees every complaint and every request about your personal data.",
      officerContact || null,
      "",
      "If you are not satisfied, you may approach the Data Protection Board of India for privacy matters, a consumer commission, or the State Medical Council for a doctor's professional conduct.",
    ),
  },
  cookies: {
    title: "Cookie policy",
    summary: "The small files we use, and your choices.",
    updated: "2026-10-17",
    body: `## Essential cookies (always on)
- Your sign in session, so you stay logged in.
- Your language, currency, time zone and light or dark theme.
- Security protections.

## Optional cookies (only if you agree)
- Anonymous usage statistics to improve the service.

We do not use advertising cookies. You can change your choice at any time from the cookie notice or your browser settings.`,
  },
  "medical-disclaimer": {
    title: "Medical disclaimer",
    summary: "What the information on this website is and is not.",
    updated: "2026-10-17",
    body: `The information on this website, including descriptions of specialties, treatments and costs, is general information. It is not a diagnosis or a treatment plan for you. Only a doctor who has consulted you can give you medical advice.

Cost estimates for treatment in India are a guide. The final cost depends on your condition and the treatment you receive.

**${EMERGENCY}**`,
  },
};
