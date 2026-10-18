// Demo doctors for the four specialties. Registration numbers are prefixed
// DEMO- and are not real. Every visible doctor holds a verified Indian
// registration: a State Medical Council for doctors, or the Rehabilitation
// Council of India for clinical psychologists.
type Fee = { video?: number; audio?: number; chat?: number; in_clinic?: number };
type ForeignFee = { currency: string; video?: number; audio?: number; chat?: number };
type Licence = {
  country: string;
  region?: string;
  number: string;
  issuingBody: string;
  expiresInDays?: number; // negative = already expired
  status?: "verified" | "pending" | "expired" | "suspended";
};
type Rule = { group: "online" | "in_clinic"; days: number[]; start: string; end: string; clinic?: string; tz?: string };

export type DoctorSeed = {
  slug: string;
  fullName: string;
  gender: "female" | "male";
  specialty: string;
  subSpecialties: string[];
  conditionsTreated: string[];
  procedures: string[];
  experienceYears: number;
  languages: string[];
  clinic?: string;
  headline: string;
  about: string;
  qualifications: { degree: string; institution: string; year: number }[];
  pastPositions: { title: string; place: string; from?: number; to?: number }[];
  awards?: { title: string; year?: number; by?: string }[];
  memberships?: string[];
  publications?: string[];
  feesInr: Fee;
  foreignFees?: ForeignFee[];
  licences: Licence[];
  rules: Rule[];
  acceptsInstant?: boolean;
  offersSecondOpinion?: boolean;
  chatResponseMinutes?: number;
  followUpChatDays?: number;
  consultMinutes?: number;
  verification?: "approved" | "submitted" | "suspended";
  timeZone?: string;
  /** Treatment and other fees in rupees (shown on the profile). */
  feeItems?: { name: string; from: number; to?: number; note?: string }[];
  /** The doctor's own UPI and bank details; patients pay the doctor directly. */
  paymentDetails?: { upiId?: string; accountName?: string; bankName?: string; accountNumber?: string; ifsc?: string; swift?: string; notes?: string };
};

const MON_SAT = [1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];
const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6];

const SUNRISE = "sunrise-valley-hospital-gurugram";
const LOTUS = "lotus-family-clinic-bengaluru";
const RIVERSIDE = "riverside-family-clinic-pune";

/** Round prices for patients paying from abroad: [video, audio, chat] in each currency. */
function intl(usd: number[], gbp: number[], eur: number[], aed: number[]): ForeignFee[] {
  const row = (currency: string, [video, audio, chat]: number[]) => ({ currency, video, audio, chat });
  return [row("USD", usd), row("GBP", gbp), row("EUR", eur), row("AED", aed)];
}
const INTL = {
  senior: intl([30, 25, 20], [25, 20, 15], [30, 25, 20], [110, 90, 75]),
  standard: intl([20, 15, 12], [16, 12, 10], [18, 15, 12], [75, 55, 45]),
  basic: intl([12, 10, 8], [10, 8, 6], [12, 10, 8], [45, 35, 30]),
};

export const DOCTORS: DoctorSeed[] = [
  // ---------------------------------------------------------- Orthopaedics
  {
    slug: "dr-harpreet-gill",
    feeItems: [
      { name: "Knee replacement surgery (one knee)", from: 250000, to: 350000, note: "Hospital charges included; final cost confirmed after tests" },
      { name: "Arthroscopy for a ligament tear", from: 120000, to: 180000 },
      { name: "Second review of MRI or X-ray", from: 500 },
    ],
    fullName: "Dr. Harpreet Gill",
    gender: "male",
    specialty: "orthopaedics",
    subSpecialties: ["Joint replacement", "Arthroscopy"],
    conditionsTreated: ["Knee arthritis", "Hip arthritis", "Ligament tears", "Sports injuries"],
    procedures: ["Total knee replacement", "Total hip replacement", "Keyhole ligament repair"],
    experienceYears: 19,
    languages: ["en", "hi", "pa"],
    clinic: SUNRISE,
    headline: "Knee and hip replacement surgeon in Gurugram",
    about:
      "I treat knee and hip arthritis and sports injuries, and I perform joint replacement and keyhole surgery at Sunrise Valley Hospital. Before any operation I explain the options in plain words, including what you can expect and how long recovery takes. Many of my patients live in other countries, so I am happy to review your reports online before you decide to travel to India.",
    qualifications: [
      { degree: "MBBS", institution: "Government Medical College, Patiala", year: 2003 },
      { degree: "MS (Orthopaedics)", institution: "Government Medical College, Amritsar", year: 2007 },
      { degree: "Fellowship in Joint Replacement", institution: "Joint replacement centre, Germany", year: 2010 },
    ],
    pastPositions: [
      { title: "Senior Consultant, Orthopaedics", place: "Bone and Joint Hospital, Delhi", from: 2010, to: 2016 },
      { title: "Head of Joint Replacement", place: "Sunrise Valley Hospital, Gurugram", from: 2016 },
    ],
    memberships: ["Indian Orthopaedic Association", "Indian Society of Hip and Knee Surgeons"],
    feesInr: { video: 1000, audio: 900, chat: 700, in_clinic: 1200 },
    foreignFees: INTL.senior,
    licences: [{ country: "IN", number: "DEMO-HMC-14420", issuingBody: "Haryana Medical Council", expiresInDays: 1300 }],
    rules: [
      { group: "online", days: [1, 3, 5], start: "18:00", end: "20:00" },
      { group: "online", days: [6], start: "15:00", end: "17:00" },
      { group: "in_clinic", days: [2, 4, 6], start: "10:00", end: "14:00", clinic: SUNRISE },
    ],
    offersSecondOpinion: true,
    consultMinutes: 20,
    followUpChatDays: 7,
    chatResponseMinutes: 60,
  },
  {
    slug: "dr-deepa-kulkarni",
    fullName: "Dr. Deepa Kulkarni",
    gender: "female",
    specialty: "orthopaedics",
    subSpecialties: ["Spine care", "Sports medicine"],
    conditionsTreated: ["Back pain", "Neck pain", "Frozen shoulder", "Sprains", "Osteoporosis"],
    procedures: ["Joint injection", "Plaster and splint", "Fracture care"],
    experienceYears: 9,
    languages: ["en", "hi", "mr"],
    clinic: RIVERSIDE,
    headline: "Back, neck and sports injuries",
    about:
      "I treat back and neck pain, sports injuries and weak bones. I work closely with physiotherapists and give you a clear exercise plan, so you can get back to work and to the things you enjoy.",
    qualifications: [
      { degree: "MBBS", institution: "Government Medical College, Kolhapur", year: 2013 },
      { degree: "D.Ortho", institution: "Government Medical College, Nagpur", year: 2016 },
      { degree: "DNB (Orthopaedics)", institution: "National Board of Examinations", year: 2018 },
    ],
    pastPositions: [{ title: "Consultant", place: "Sports Injury Clinic, Mumbai", from: 2018, to: 2022 }],
    feesInr: { video: 600, audio: 500, chat: 400, in_clinic: 800 },
    foreignFees: INTL.standard,
    licences: [{ country: "IN", number: "DEMO-MMC-2013/31007", issuingBody: "Maharashtra Medical Council", expiresInDays: 830 }],
    rules: [
      { group: "online", days: MON_SAT, start: "09:00", end: "11:00" },
      { group: "online", days: WEEKDAYS, start: "20:00", end: "21:30" },
      { group: "in_clinic", days: MON_SAT, start: "17:00", end: "20:00", clinic: RIVERSIDE },
    ],
    chatResponseMinutes: 30,
  },
  {
    slug: "dr-naveen-krishnamurthy",
    fullName: "Dr. Naveen Krishnamurthy",
    gender: "male",
    specialty: "orthopaedics",
    subSpecialties: ["Shoulder and knee arthroscopy", "Sports injuries"],
    conditionsTreated: ["Shoulder pain", "Rotator cuff tears", "Meniscus tears", "Ankle sprains", "Tennis elbow"],
    procedures: ["Keyhole shoulder repair", "Meniscus repair", "Joint injection"],
    experienceYears: 12,
    languages: ["en", "hi", "kn"],
    clinic: LOTUS,
    headline: "Shoulder and knee problems and sports injuries",
    about:
      "I look after people with shoulder and knee pain, from weekend players to older adults with stiff joints. Most problems get better without surgery, and I will always tell you honestly when an operation is really needed.",
    qualifications: [
      { degree: "MBBS", institution: "Government Medical College, Mysuru", year: 2010 },
      { degree: "MS (Orthopaedics)", institution: "Government Medical College, Bengaluru", year: 2014 },
      { degree: "Fellowship in Arthroscopy and Sports Medicine", institution: "Sports injury centre, New Delhi", year: 2016 },
    ],
    pastPositions: [{ title: "Consultant, Orthopaedics", place: "City hospital, Bengaluru", from: 2016, to: 2022 }],
    memberships: ["Indian Arthroscopy Society"],
    feesInr: { video: 800, audio: 700, chat: 500, in_clinic: 900 },
    foreignFees: INTL.standard,
    licences: [{ country: "IN", number: "DEMO-KMC-58810", issuingBody: "Karnataka Medical Council", expiresInDays: 980 }],
    rules: [
      { group: "online", days: MON_SAT, start: "13:00", end: "15:00" },
      { group: "online", days: WEEKDAYS, start: "19:00", end: "21:00" },
      { group: "in_clinic", days: [1, 3, 5], start: "10:00", end: "13:00", clinic: LOTUS },
    ],
    chatResponseMinutes: 45,
    followUpChatDays: 5,
  },

  // ---------------------------------------------------------- Dermatology
  {
    slug: "dr-nikhil-menon",
    fullName: "Dr. Nikhil Menon",
    gender: "male",
    specialty: "dermatology",
    subSpecialties: ["Acne and scars", "Hair loss"],
    conditionsTreated: ["Acne", "Hair fall", "Eczema", "Psoriasis", "Fungal infections", "Pigmentation"],
    procedures: ["Chemical peel", "PRP for hair", "Skin biopsy"],
    experienceYears: 10,
    languages: ["en", "hi", "ml"],
    clinic: RIVERSIDE,
    headline: "Clear, honest advice for skin and hair",
    about:
      "I treat acne, eczema, hair loss and other skin problems. I will tell you what will help, how long it takes, and what is not worth spending money on.",
    qualifications: [
      { degree: "MBBS", institution: "Government Medical College, Kozhikode", year: 2012 },
      { degree: "MD (Dermatology, Venereology and Leprosy)", institution: "Government Medical College, Pune", year: 2016 },
    ],
    pastPositions: [{ title: "Consultant Dermatologist", place: "Skin Centre, Pune", from: 2016, to: 2021 }],
    memberships: ["Indian Association of Dermatologists, Venereologists and Leprologists"],
    feesInr: { video: 500, audio: 450, chat: 350, in_clinic: 700 },
    foreignFees: INTL.basic,
    licences: [{ country: "IN", number: "DEMO-MMC-2012/44190", issuingBody: "Maharashtra Medical Council", expiresInDays: 400 }],
    rules: [
      { group: "online", days: MON_SAT, start: "12:00", end: "15:00" },
      { group: "in_clinic", days: [1, 3, 5], start: "16:00", end: "19:00", clinic: RIVERSIDE },
    ],
    chatResponseMinutes: 30,
  },
  {
    slug: "dr-sana-mirza",
    feeItems: [
      { name: "Acne treatment plan (3 months)", from: 3000, to: 6000 },
      { name: "Chemical peel (one session)", from: 2500 },
    ],
    fullName: "Dr. Sana Mirza",
    gender: "female",
    specialty: "dermatology",
    subSpecialties: ["Skin allergies", "Skin care for children"],
    conditionsTreated: ["Eczema", "Hives", "Acne", "Melasma", "Nail problems"],
    procedures: [],
    experienceYears: 8,
    languages: ["en", "hi", "ur"],
    headline: "Skin care for the whole family, online",
    about:
      "I help adults and children with eczema, hives, acne and pigmentation. Clear photos taken in daylight help me a lot, and I always explain how and when to use each cream.",
    qualifications: [
      { degree: "MBBS", institution: "Government Medical College, Hyderabad", year: 2014 },
      { degree: "DNB (Dermatology)", institution: "National Board of Examinations", year: 2018 },
    ],
    pastPositions: [{ title: "Consultant", place: "Skin and Hair Clinic, Hyderabad", from: 2018, to: 2023 }],
    feesInr: { video: 450, audio: 400, chat: 300 },
    foreignFees: INTL.basic,
    licences: [{ country: "IN", number: "DEMO-TSMC-27711", issuingBody: "Telangana State Medical Council", expiresInDays: 720 }],
    rules: [
      { group: "online", days: MON_SAT, start: "15:00", end: "19:00" },
      { group: "online", days: [0], start: "10:00", end: "12:00" },
    ],
    acceptsInstant: true,
    chatResponseMinutes: 20,
  },
  {
    slug: "dr-aarti-saxena",
    fullName: "Dr. Aarti Saxena",
    gender: "female",
    specialty: "dermatology",
    subSpecialties: ["Hair and scalp", "Pigmentation"],
    conditionsTreated: ["Hair loss", "Dandruff", "Melasma", "Psoriasis", "Adult acne"],
    procedures: ["Scalp examination", "Chemical peel", "Skin biopsy"],
    experienceYears: 14,
    languages: ["en", "hi"],
    clinic: SUNRISE,
    headline: "Hair loss, pigmentation and long term skin conditions",
    about:
      "I see many people with hair fall, scalp problems, pigmentation and psoriasis. I explain the cause first, then build a simple routine you can follow, and I review your progress with you at each follow up.",
    qualifications: [
      { degree: "MBBS", institution: "Government Medical College, Jaipur", year: 2008 },
      { degree: "MD (Dermatology, Venereology and Leprosy)", institution: "Government Medical College, Delhi", year: 2012 },
    ],
    pastPositions: [
      { title: "Senior Resident, Dermatology", place: "Teaching hospital, New Delhi", from: 2012, to: 2015 },
      { title: "Consultant Dermatologist", place: "Sunrise Valley Hospital, Gurugram", from: 2015 },
    ],
    memberships: ["Indian Association of Dermatologists, Venereologists and Leprologists"],
    feesInr: { video: 700, audio: 600, chat: 450, in_clinic: 900 },
    foreignFees: INTL.standard,
    licences: [{ country: "IN", number: "DEMO-HMC-27354", issuingBody: "Haryana Medical Council", expiresInDays: 860 }],
    rules: [
      { group: "online", days: MON_SAT, start: "16:00", end: "19:00" },
      { group: "in_clinic", days: [2, 4, 6], start: "10:00", end: "13:00", clinic: SUNRISE },
    ],
    chatResponseMinutes: 45,
    followUpChatDays: 5,
  },

  // ---------------------------------------------------------- General Physician
  {
    slug: "dr-kavita-sharma",
    fullName: "Dr. Kavita Sharma",
    gender: "female",
    specialty: "general-physician",
    subSpecialties: ["Internal medicine", "Preventive health"],
    conditionsTreated: ["Fever", "Diabetes", "High blood pressure", "Thyroid", "Acidity", "Infections"],
    procedures: ["Health check up review", "Medicine review"],
    experienceYears: 14,
    languages: ["en", "hi"],
    clinic: SUNRISE,
    headline: "Family physician who explains things in simple words",
    about:
      "I look after adults with everyday illnesses and long term conditions like diabetes and blood pressure. I take time to explain what is going on and what you can do at home, and I tell you clearly when you need to be seen in person.",
    qualifications: [
      { degree: "MBBS", institution: "Government Medical College, Chandigarh", year: 2010 },
      { degree: "MD (Internal Medicine)", institution: "Postgraduate Institute, Rohtak", year: 2014 },
    ],
    pastPositions: [{ title: "Senior Resident, Medicine", place: "District Hospital, Gurugram", from: 2014, to: 2018 }],
    memberships: ["Association of Physicians of India"],
    feesInr: { video: 400, audio: 350, chat: 250, in_clinic: 600 },
    foreignFees: INTL.basic,
    licences: [{ country: "IN", number: "DEMO-HMC-21877", issuingBody: "Haryana Medical Council", expiresInDays: 900 }],
    rules: [
      { group: "online", days: MON_SAT, start: "09:00", end: "13:00" },
      { group: "online", days: WEEKDAYS, start: "18:00", end: "21:00" },
      { group: "in_clinic", days: [1, 3, 5], start: "14:00", end: "17:00", clinic: SUNRISE },
    ],
    acceptsInstant: true,
    chatResponseMinutes: 20,
    followUpChatDays: 3,
  },
  {
    slug: "dr-anita-joseph",
    fullName: "Dr. Anita Joseph",
    gender: "female",
    specialty: "general-physician",
    subSpecialties: ["Care of older adults", "Internal medicine"],
    conditionsTreated: ["Diabetes", "High blood pressure", "Memory problems", "Falls", "Medicine reviews"],
    procedures: ["Medicine review for older adults"],
    experienceYears: 21,
    languages: ["en", "hi", "ml"],
    clinic: RIVERSIDE,
    headline: "Care for older adults and for families who live far apart",
    about:
      "I have looked after older patients for more than 20 years, in India and in the UK. Many families who live abroad book consultations with me for their parents in India, and I make sure everyone understands the plan.",
    qualifications: [
      { degree: "MBBS", institution: "Government Medical College, Kottayam", year: 2003 },
      { degree: "MD (General Medicine)", institution: "Government Medical College, Thiruvananthapuram", year: 2007 },
      { degree: "MRCP (UK)", institution: "Royal College of Physicians", year: 2011 },
    ],
    pastPositions: [
      { title: "Specialty Doctor, Elderly Care", place: "NHS hospital trust, Leicester", from: 2009, to: 2016 },
      { title: "Consultant Physician", place: "Riverside Family Clinic, Pune", from: 2016 },
    ],
    memberships: ["Indian Academy of Geriatrics", "Royal College of Physicians"],
    feesInr: { video: 600, audio: 500, chat: 400, in_clinic: 800 },
    foreignFees: INTL.standard,
    licences: [{ country: "IN", number: "DEMO-MMC-2003/11422", issuingBody: "Maharashtra Medical Council", expiresInDays: 1100 }],
    rules: [
      { group: "online", days: MON_SAT, start: "10:00", end: "13:00" },
      { group: "online", days: WEEKDAYS, start: "19:00", end: "22:30" }, // evenings suit families in Europe and the Gulf
      { group: "in_clinic", days: [2, 4, 6], start: "14:30", end: "17:30", clinic: RIVERSIDE },
    ],
    chatResponseMinutes: 45,
    followUpChatDays: 7,
    consultMinutes: 20,
  },
  {
    slug: "dr-imran-qureshi",
    // Sample details for trying direct payment (not a real account).
    paymentDetails: { upiId: "imran.qureshi.demo@upi", accountName: "Imran Qureshi", bankName: "Sample Bank", accountNumber: "000123456789", ifsc: "SMPL0001234", swift: "SMPLINBB" },
    feeItems: [
      { name: "Follow up consultation within 7 days", from: 150 },
      { name: "Full health check up review", from: 800, note: "Reports reviewed and a written plan" },
    ],
    fullName: "Dr. Imran Qureshi",
    gender: "male",
    specialty: "general-physician",
    subSpecialties: ["Family medicine"],
    conditionsTreated: ["Fever", "Cough and cold", "Stomach upset", "Skin infections", "Urine infection"],
    procedures: [],
    experienceYears: 9,
    languages: ["en", "hi", "ur"],
    headline: "Quick, careful help for common illnesses",
    about:
      "I see patients online for fevers, coughs, stomach problems and infections. I will ask you a few questions, help you understand what is likely going on, and make a clear plan with you.",
    qualifications: [
      { degree: "MBBS", institution: "State Medical College, Lucknow", year: 2015 },
      { degree: "Diploma in Family Medicine", institution: "National Board of Examinations", year: 2018 },
    ],
    pastPositions: [{ title: "Medical Officer", place: "Community Health Centre, Barabanki", from: 2016, to: 2020 }],
    feesInr: { video: 300, audio: 250, chat: 200 },
    foreignFees: INTL.basic,
    // Expires soon, so the licence reminder and the re-verification queue have something to show.
    licences: [{ country: "IN", number: "DEMO-UPMC-55102", issuingBody: "Uttar Pradesh Medical Council", expiresInDays: 45 }],
    rules: [
      { group: "online", days: ALL_WEEK, start: "08:00", end: "12:00" },
      { group: "online", days: ALL_WEEK, start: "16:00", end: "22:00" },
    ],
    acceptsInstant: true,
    chatResponseMinutes: 10,
    followUpChatDays: 3,
    consultMinutes: 10,
  },

  // ---------------------------------------------------------- Psychology
  {
    slug: "dr-arvind-rao",
    fullName: "Dr. Arvind Rao",
    gender: "male",
    specialty: "psychology",
    subSpecialties: ["Consultant psychiatrist", "Anxiety and depression"],
    conditionsTreated: ["Depression", "Anxiety", "Insomnia", "OCD", "Bipolar disorder", "Adult ADHD"],
    procedures: ["Medicine review", "Psychotherapy"],
    experienceYears: 17,
    languages: ["en", "hi", "kn"],
    headline: "Consultant psychiatrist for anxiety, low mood and sleep problems",
    about:
      "I am a consultant psychiatrist. I help people with anxiety, depression, sleep problems and other mental health conditions, and I work closely with our clinical psychologists. When medicine may help, I explain the choices, the likely side effects and how long you may need it.",
    qualifications: [
      { degree: "MBBS", institution: "Government Medical College, Mysuru", year: 2005 },
      { degree: "MD (Psychiatry)", institution: "Institute of Mental Health, Bengaluru", year: 2009 },
    ],
    pastPositions: [
      { title: "Specialty Doctor, Psychiatry", place: "NHS mental health trust, Manchester", from: 2011, to: 2015 },
      { title: "Consultant Psychiatrist", place: "Teaching hospital, Bengaluru", from: 2015, to: 2021 },
    ],
    memberships: ["Indian Psychiatric Society", "Royal College of Psychiatrists"],
    feesInr: { video: 900, audio: 800, chat: 600 },
    foreignFees: INTL.senior,
    licences: [{ country: "IN", number: "DEMO-KMC-44718", issuingBody: "Karnataka Medical Council", expiresInDays: 900 }],
    rules: [
      { group: "online", days: WEEKDAYS, start: "10:00", end: "13:00" },
      { group: "online", days: MON_SAT, start: "18:00", end: "22:00" },
    ],
    chatResponseMinutes: 90,
    followUpChatDays: 7,
    consultMinutes: 30,
  },
  {
    slug: "ira-banerjee",
    fullName: "Ira Banerjee",
    gender: "female",
    specialty: "psychology",
    subSpecialties: ["Clinical psychology", "Cognitive behavioural therapy"],
    conditionsTreated: ["Anxiety", "Panic attacks", "Low mood", "OCD", "Exam and work stress"],
    procedures: ["Cognitive behavioural therapy", "Psychological assessment"],
    experienceYears: 11,
    languages: ["en", "hi", "bn"],
    headline: "Clinical psychologist for anxiety, panic and low mood",
    about:
      "I am a clinical psychologist. I use cognitive behavioural therapy and other proven talking therapies to help with anxiety, panic, low mood and stress. We set goals together, and you learn skills you can keep using long after our sessions end.",
    qualifications: [
      { degree: "MA (Psychology)", institution: "University of Calcutta", year: 2012 },
      { degree: "M.Phil (Clinical Psychology)", institution: "Institute of Psychiatry, Kolkata", year: 2014 },
    ],
    pastPositions: [{ title: "Clinical Psychologist", place: "Teaching hospital, Kolkata", from: 2014, to: 2020 }],
    memberships: ["Indian Association of Clinical Psychologists"],
    feesInr: { video: 800, audio: 700, chat: 500 },
    foreignFees: INTL.standard,
    licences: [{ country: "IN", number: "DEMO-RCI-A41207", issuingBody: "Rehabilitation Council of India", expiresInDays: 1000 }],
    rules: [
      { group: "online", days: MON_SAT, start: "10:00", end: "14:00" },
      { group: "online", days: WEEKDAYS, start: "18:00", end: "21:00" },
    ],
    chatResponseMinutes: 60,
    followUpChatDays: 7,
    consultMinutes: 45,
  },
  {
    slug: "kunal-deshmukh",
    fullName: "Kunal Deshmukh",
    gender: "male",
    specialty: "psychology",
    subSpecialties: ["Clinical psychology", "Couples and family therapy"],
    conditionsTreated: ["Relationship problems", "Stress", "Insomnia", "Grief", "Anger"],
    procedures: ["Couples therapy", "Therapy for sleep problems"],
    experienceYears: 8,
    languages: ["en", "hi", "mr"],
    clinic: RIVERSIDE,
    headline: "Clinical psychologist for relationships, stress and sleep",
    about:
      "I help individuals, couples and families with stress, relationship difficulties, grief and sleep problems. Sessions are calm and practical, and you can speak in English, Hindi or Marathi.",
    qualifications: [
      { degree: "MA (Clinical Psychology)", institution: "Savitribai Phule Pune University", year: 2014 },
      { degree: "M.Phil (Clinical Psychology)", institution: "Government Medical College, Nagpur", year: 2016 },
    ],
    pastPositions: [{ title: "Clinical Psychologist", place: "Counselling centre, Pune", from: 2016, to: 2022 }],
    memberships: ["Indian Association of Clinical Psychologists"],
    feesInr: { video: 700, audio: 600, chat: 450, in_clinic: 900 },
    foreignFees: INTL.standard,
    licences: [{ country: "IN", number: "DEMO-RCI-A52918", issuingBody: "Rehabilitation Council of India", expiresInDays: 760 }],
    rules: [
      { group: "online", days: WEEKDAYS, start: "17:00", end: "21:00" },
      { group: "online", days: [6], start: "10:00", end: "13:00" },
      { group: "in_clinic", days: [2, 4], start: "11:00", end: "14:00", clinic: RIVERSIDE },
    ],
    chatResponseMinutes: 60,
    followUpChatDays: 7,
    consultMinutes: 45,
  },

  // ------------------------------------- Never shown to patients (for testing)
  {
    slug: "dr-vivek-malhotra",
    fullName: "Dr. Vivek Malhotra",
    gender: "male",
    specialty: "general-physician",
    subSpecialties: [],
    conditionsTreated: ["Fever"],
    procedures: [],
    experienceYears: 4,
    languages: ["en", "hi"],
    headline: "Awaiting verification",
    about: "New doctor whose documents are waiting for admin verification. Never shown to patients.",
    qualifications: [{ degree: "MBBS", institution: "Government Medical College, Bhopal", year: 2020 }],
    pastPositions: [],
    feesInr: { video: 250, audio: 200, chat: 150 },
    licences: [{ country: "IN", number: "DEMO-MPMC-90012", issuingBody: "Madhya Pradesh Medical Council", expiresInDays: 700, status: "pending" }],
    rules: [{ group: "online", days: ALL_WEEK, start: "09:00", end: "12:00" }],
    verification: "submitted",
  },
  {
    slug: "dr-karan-sethi",
    fullName: "Dr. Karan Sethi",
    gender: "male",
    specialty: "dermatology",
    subSpecialties: [],
    conditionsTreated: ["Acne"],
    procedures: [],
    experienceYears: 12,
    languages: ["en", "hi"],
    headline: "Licence expired",
    about: "Approved doctor whose only registration has expired, so the profile is hidden automatically.",
    qualifications: [{ degree: "MBBS", institution: "Government Medical College, Indore", year: 2010 }],
    pastPositions: [],
    feesInr: { video: 500 },
    licences: [{ country: "IN", number: "DEMO-MPMC-77120", issuingBody: "Madhya Pradesh Medical Council", expiresInDays: -5, status: "verified" }],
    rules: [{ group: "online", days: ALL_WEEK, start: "09:00", end: "12:00" }],
  },
  {
    slug: "dr-neeraj-bansal",
    fullName: "Dr. Neeraj Bansal",
    gender: "male",
    specialty: "general-physician",
    subSpecialties: [],
    conditionsTreated: ["Fever"],
    procedures: [],
    experienceYears: 15,
    languages: ["en", "hi"],
    headline: "Suspended",
    about: "Suspended doctor. Never shown to patients.",
    qualifications: [{ degree: "MBBS", institution: "Government Medical College, Kanpur", year: 2008 }],
    pastPositions: [],
    feesInr: { video: 300 },
    licences: [{ country: "IN", number: "DEMO-UPMC-11000", issuingBody: "Uttar Pradesh Medical Council", expiresInDays: 400, status: "suspended" }],
    rules: [{ group: "online", days: ALL_WEEK, start: "09:00", end: "12:00" }],
    verification: "suspended",
  },
  {
    slug: "dr-thomas-george",
    fullName: "Dr. Thomas George",
    gender: "male",
    specialty: "general-physician",
    subSpecialties: [],
    conditionsTreated: ["Fever"],
    procedures: [],
    experienceYears: 10,
    languages: ["en", "hi"],
    headline: "No Indian registration",
    about: "Approved doctor whose only registration is outside India, so the profile is hidden automatically.",
    qualifications: [{ degree: "MBBS", institution: "Government Medical College, Kottayam", year: 2012 }],
    pastPositions: [],
    feesInr: { video: 500 },
    licences: [{ country: "GB", number: "DEMO-GMC-7012345", issuingBody: "General Medical Council (UK)", expiresInDays: 600, status: "verified" }],
    rules: [{ group: "online", days: ALL_WEEK, start: "09:00", end: "12:00" }],
  },
];

/** True for doctors patients can see: approved with a verified, unexpired Indian registration. */
export function isVisibleSeed(d: DoctorSeed) {
  return (d.verification ?? "approved") === "approved" && d.licences.some((l) => l.country === "IN" && (l.status ?? "verified") === "verified" && (l.expiresInDays ?? 700) > 0);
}
