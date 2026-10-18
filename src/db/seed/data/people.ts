// Demo people. Phone numbers use reserved or test ranges where possible.
export type PersonSeed = {
  fullName: string;
  dob: string;
  sex: "female" | "male";
  phone?: string;
  email?: string;
  country: string;
  city: string;
  bloodGroup?: string;
  allergies?: string[];
  conditions?: string[];
  currentMedicines?: string[];
  emergencyContact?: { name: string; phone: string; relationship: string };
  preferredLanguage?: string;
};

export type AccountSeed = {
  key: string;
  role: "patient" | "caregiver";
  name: string;
  email?: string;
  phone: string;
  country: string;
  language: string;
  currency: string;
  timeZone: string;
  whatsappOptIn?: boolean;
  self: PersonSeed | null;
  family: (PersonSeed & { key: string; relationship: string; consent: "otp" | "guardian_declaration" | "pending" })[];
};

export const ACCOUNTS: AccountSeed[] = [
  {
    key: "asha",
    role: "patient",
    name: "Asha Verma",
    phone: "+919810000001",
    country: "IN",
    language: "hi",
    currency: "INR",
    timeZone: "Asia/Kolkata",
    whatsappOptIn: true,
    self: {
      fullName: "Asha Verma",
      dob: "1963-05-12",
      sex: "female",
      phone: "+919810000001",
      country: "IN",
      city: "Lucknow",
      bloodGroup: "B+",
      allergies: [],
      conditions: ["High blood pressure", "Knee pain"],
      currentMedicines: ["Amlodipine 5 mg once daily"],
      emergencyContact: { name: "Rohit Verma", phone: "+919810000011", relationship: "Son" },
      preferredLanguage: "hi",
    },
    family: [],
  },
  {
    key: "rahul",
    role: "patient",
    name: "Rahul Mehta",
    email: "rahul.mehta@demo.example",
    phone: "+919810000002",
    country: "IN",
    language: "en",
    currency: "INR",
    timeZone: "Asia/Kolkata",
    self: {
      fullName: "Rahul Mehta",
      dob: "1991-08-20",
      sex: "male",
      phone: "+919810000002",
      email: "rahul.mehta@demo.example",
      country: "IN",
      city: "Mumbai",
      bloodGroup: "O+",
      allergies: ["Penicillin"],
      conditions: [],
      currentMedicines: [],
    },
    family: [
      { key: "priya", relationship: "Spouse", fullName: "Priya Mehta", dob: "1993-01-09", sex: "female", phone: "+919810000022", country: "IN", city: "Mumbai", bloodGroup: "A+", conditions: ["PCOS"], consent: "otp" },
      { key: "kabir", relationship: "Son", fullName: "Kabir Mehta", dob: "2019-11-03", sex: "male", country: "IN", city: "Mumbai", allergies: ["Peanuts"], conditions: ["Eczema"], consent: "guardian_declaration" },
    ],
  },
  {
    key: "sunita",
    role: "patient",
    name: "Sunita Rao",
    phone: "+919810000003",
    email: "sunita.rao@demo.example",
    country: "IN",
    language: "en",
    currency: "INR",
    timeZone: "Asia/Kolkata",
    self: {
      fullName: "Sunita Rao",
      dob: "1980-02-14",
      sex: "female",
      phone: "+919810000003",
      country: "IN",
      city: "Bengaluru",
      bloodGroup: "AB+",
      allergies: ["Sulfa drugs"],
      conditions: ["Type 2 diabetes"],
      currentMedicines: ["Metformin 500 mg twice daily"],
    },
    family: [],
  },
  {
    key: "arjun",
    role: "caregiver",
    name: "Arjun Nair",
    email: "arjun.nair@demo.example",
    phone: "+447700900123",
    country: "GB",
    language: "en",
    currency: "GBP",
    timeZone: "Europe/London",
    whatsappOptIn: true,
    self: {
      fullName: "Arjun Nair",
      dob: "1988-04-02",
      sex: "male",
      phone: "+447700900123",
      country: "GB",
      city: "London",
      bloodGroup: "O+",
    },
    family: [
      {
        key: "krishnan",
        relationship: "Father",
        fullName: "Krishnan Nair",
        dob: "1954-01-15",
        sex: "male",
        phone: "+919810000041",
        country: "IN",
        city: "Kochi",
        bloodGroup: "O+",
        allergies: ["Penicillin"],
        conditions: ["High blood pressure", "Coronary artery disease"],
        currentMedicines: ["Aspirin 75 mg once daily", "Atorvastatin 20 mg at night", "Telmisartan 40 mg once daily"],
        emergencyContact: { name: "Arjun Nair", phone: "+447700900123", relationship: "Son (in UK)" },
        preferredLanguage: "ml",
        consent: "otp",
      },
      {
        key: "lakshmi",
        relationship: "Mother",
        fullName: "Lakshmi Nair",
        dob: "1958-06-30",
        sex: "female",
        phone: "+919810000042",
        country: "IN",
        city: "Kochi",
        bloodGroup: "A+",
        conditions: ["Hypothyroidism"],
        currentMedicines: ["Levothyroxine 50 mcg before breakfast"],
        preferredLanguage: "ml",
        consent: "otp",
      },
    ],
  },
  {
    key: "meera",
    role: "caregiver",
    name: "Meera Iyer",
    email: "meera.iyer@demo.example",
    phone: "+971501234567",
    country: "AE",
    language: "en",
    currency: "AED",
    timeZone: "Asia/Dubai",
    self: { fullName: "Meera Iyer", dob: "1985-09-18", sex: "female", phone: "+971501234567", country: "AE", city: "Dubai" },
    family: [
      {
        key: "saraswathi",
        relationship: "Mother",
        fullName: "Saraswathi Iyer",
        dob: "1952-12-01",
        sex: "female",
        phone: "+919810000051",
        country: "IN",
        city: "Chennai",
        conditions: ["Type 2 diabetes", "Osteoarthritis"],
        currentMedicines: ["Metformin 1000 mg twice daily", "Glimepiride 1 mg before breakfast"],
        preferredLanguage: "ta",
        consent: "otp",
      },
    ],
  },
  {
    key: "fatima",
    role: "patient",
    name: "Fatima Rahman",
    email: "fatima.rahman@demo.example",
    phone: "+8801711000000",
    country: "BD",
    language: "en",
    currency: "BDT",
    timeZone: "Asia/Dhaka",
    self: {
      fullName: "Fatima Rahman",
      dob: "1966-03-09",
      sex: "female",
      phone: "+8801711000000",
      country: "BD",
      city: "Dhaka",
      bloodGroup: "B+",
      conditions: ["Osteoarthritis of both knees", "High blood pressure"],
      currentMedicines: ["Amlodipine 5 mg once daily"],
    },
    family: [],
  },
  {
    key: "daniel",
    role: "patient",
    name: "Daniel Otieno",
    email: "daniel.otieno@demo.example",
    phone: "+254700000100",
    country: "KE",
    language: "en",
    currency: "USD",
    timeZone: "Africa/Nairobi",
    self: {
      fullName: "Daniel Otieno",
      dob: "1979-02-17",
      sex: "male",
      phone: "+254700000100",
      country: "KE",
      city: "Nairobi",
      bloodGroup: "A+",
      conditions: ["Lower back pain"],
      currentMedicines: [],
    },
    family: [],
  },
  {
    key: "neha",
    role: "patient",
    name: "Neha Gupta",
    email: "neha.gupta@demo.example",
    phone: "+919810000008",
    country: "IN",
    language: "en",
    currency: "INR",
    timeZone: "Asia/Kolkata",
    self: { fullName: "Neha Gupta", dob: "1997-10-21", sex: "female", phone: "+919810000008", country: "IN", city: "New Delhi", bloodGroup: "O-" },
    family: [],
  },
  {
    key: "vikram",
    role: "patient",
    name: "Vikram Singh",
    phone: "+919810000009",
    country: "IN",
    language: "hi",
    currency: "INR",
    timeZone: "Asia/Kolkata",
    self: {
      fullName: "Vikram Singh",
      dob: "1973-03-28",
      sex: "male",
      phone: "+919810000009",
      country: "IN",
      city: "Jaipur",
      bloodGroup: "A+",
      allergies: ["Aspirin"],
      conditions: ["High blood pressure", "Knee pain"],
      currentMedicines: ["Telmisartan 40 mg once daily"],
    },
    family: [],
  },
  {
    key: "ananya",
    role: "patient",
    name: "Ananya Das",
    email: "ananya.das@demo.example",
    phone: "+919810000010",
    country: "IN",
    language: "en",
    currency: "INR",
    timeZone: "Asia/Kolkata",
    self: {
      fullName: "Ananya Das",
      dob: "1995-12-11",
      sex: "female",
      phone: "+919810000010",
      country: "IN",
      city: "Kolkata",
      conditions: ["Hypothyroidism"],
      currentMedicines: ["Levothyroxine 25 mcg before breakfast"],
    },
    family: [
      { key: "bikash", relationship: "Father", fullName: "Bikash Das", dob: "1960-05-05", sex: "male", phone: "+919810000101", country: "IN", city: "Kolkata", conditions: ["Diabetes"], consent: "pending" },
    ],
  },
];

export const STAFF = {
  admin: { name: "Aditi Rao", email: "admin@caremitra.example", phone: "+919800000001" },
  careCoordinator: { name: "Ravi Kumar", email: "care@caremitra.example", phone: "+919800000002" },
};

export const INTERPRETERS = [
  { name: "Layla Hassan", languages: ["ar", "en", "hi"], phone: "+919800000301" },
  { name: "Tanvir Ahmed", languages: ["bn", "en", "hi"], phone: "+919800000302" },
  { name: "Olga Petrova", languages: ["ru", "en"], phone: "+919800000303" },
  { name: "Amina Wanjiru", languages: ["sw", "en"], phone: "+919800000304" },
  { name: "Claire Dubois", languages: ["fr", "en"], phone: "+919800000305" },
];

export const REVIEW_TEXTS = [
  { rating: 5, text: "Very patient and explained everything clearly. I knew exactly what to do after the call." },
  { rating: 5, text: "The doctor listened to my mother carefully and spoke to her in her own language." },
  { rating: 5, text: "Got the prescription on my phone right after the call. Very easy." },
  { rating: 4, text: "On time and to the point. Would consult again." },
  { rating: 5, text: "I felt comfortable sharing my concerns. Thank you, doctor." },
  { rating: 5, text: "Explained my reports in simple words and did not rush me." },
  { rating: 4, text: "Booked the clinic visit from the same app after the online consult. Smooth." },
  { rating: 5, text: "Took time to answer all our questions, even the silly ones." },
  { rating: 3, text: "Good advice but the call started about 10 minutes late." },
  { rating: 4, text: "Clear plan and a follow up date. Video was clear even on my old phone." },
];
