import type { Faq } from "@/db/schema";

export type SpecialtySeed = {
  slug: string;
  name: string;
  nameHi: string;
  icon: string;
  shortDescription: string;
  description: string;
  symptoms: string[];
  treats: string[];
  faqs: Faq[];
  featured: boolean;
  sortOrder: number;
  reviewer: string; // doctor slug
};

/**
 * The four specialties shown on the site, in display order. Text on screen
 * goes through t(), so every string here has a Hindi entry in
 * src/i18n/dictionaries/hi-redesign-a2.ts. The starting fee is worked out from
 * the doctors' fees when the data is loaded.
 */
export const SPECIALTIES: SpecialtySeed[] = [
  {
    slug: "orthopaedics",
    name: "Orthopaedics",
    nameHi: "हड्डी रोग (ऑर्थोपेडिक्स)",
    icon: "bone",
    shortDescription: "Joint pain, back and neck pain, sports injuries, fractures and joint replacement.",
    description:
      "Orthopaedic doctors treat bones, joints, muscles, ligaments and the spine. In an online consultation you can show your X-ray or MRI, understand what it means and agree on a plan, such as exercises, medicines, physiotherapy or surgery. If you need an operation like a knee or hip replacement, we can help you plan your treatment in India.",
    symptoms: ["Knee pain", "Back pain", "Neck pain", "Shoulder pain", "Joint swelling", "Stiff joints", "Sports injury"],
    treats: ["Osteoarthritis", "Slipped disc", "Frozen shoulder", "Ligament tears", "Fracture care", "Knee and hip replacement"],
    faqs: [
      {
        q: "Can an orthopaedic doctor help me online?",
        a: "Yes, for many problems. The doctor can look at your X-ray or MRI, explain what it shows, suggest exercises and medicines, and tell you clearly if you need to be examined in person.",
      },
      {
        q: "Can I share my X-ray or MRI?",
        a: "Yes. Upload the report and the images before your consultation, or show them during the video call.",
      },
      {
        q: "I have been advised a knee or hip replacement. Can I have it done in India?",
        a: "Yes. Send us your reports and a specialist will review them free of charge, usually within 2 working days. You will receive a written treatment plan and a cost estimate in your currency, and our team can help with the medical visa, travel and stay.",
      },
    ],
    featured: true,
    sortOrder: 1,
    reviewer: "dr-harpreet-gill",
  },
  {
    slug: "dermatology",
    name: "Dermatology",
    nameHi: "त्वचा रोग (डर्मेटोलॉजी)",
    icon: "scan-face",
    shortDescription: "Acne, rashes, eczema, hair fall, pigmentation, fungal infections and nail problems.",
    description:
      "Dermatologists treat problems of the skin, hair and nails. Many skin problems can be treated well in an online consultation, because the doctor can see your skin on video and in clear photos. You get a written plan and, when it is safe, a digital prescription.",
    symptoms: ["Acne", "Itching", "Rash", "Hair fall", "Dandruff", "Dark patches", "Fungal infection", "Nail problems"],
    treats: ["Acne and acne scars", "Eczema", "Psoriasis", "Fungal infections", "Hair loss", "Pigmentation", "Hives"],
    faqs: [
      {
        q: "Should I send photos?",
        a: "Yes, please. Take clear photos in daylight, one close up and one from a little further away, and add them to the health form before your consultation.",
      },
      {
        q: "Can skin problems be treated online?",
        a: "Many can, such as acne, eczema, fungal infections and hair fall. If the doctor needs a closer look or a small test, they will tell you and suggest a clinic visit.",
      },
      {
        q: "How soon will I see results?",
        a: "It depends on the problem. Treatment for acne and hair fall usually takes 6 to 12 weeks to show a clear change, so your doctor will plan a follow up consultation with you.",
      },
    ],
    featured: true,
    sortOrder: 2,
    reviewer: "dr-nikhil-menon",
  },
  {
    slug: "general-physician",
    name: "General Physician",
    nameHi: "जनरल फिजिशियन",
    icon: "stethoscope",
    shortDescription: "Fever, infections, stomach problems, diabetes, blood pressure, thyroid and health check ups.",
    description:
      "A general physician is the right first doctor for most health problems. They treat everyday illnesses such as fever, cough and stomach upsets, look after long term conditions like diabetes, high blood pressure and thyroid problems, review your medicines and reports, and tell you when you need a specialist.",
    symptoms: ["Fever", "Cough and cold", "Sore throat", "Acidity", "Stomach upset", "Headache", "Tiredness", "Urine infection", "High sugar", "High blood pressure"],
    treats: ["Viral fever", "Cold and flu", "Gastritis", "Urinary tract infection", "Type 2 diabetes", "High blood pressure", "Thyroid problems", "Health check up review"],
    faqs: [
      {
        q: "Can a general physician treat me online?",
        a: "Yes, for many common problems such as fever, cough, acidity, and diabetes or blood pressure reviews. If the doctor needs to examine you or order tests, they will tell you clearly.",
      },
      {
        q: "Will I get a prescription?",
        a: "If it is safe to treat you online, your doctor will send a digital prescription after the consultation. Some medicines cannot be prescribed online under India's telemedicine rules.",
      },
      {
        q: "I live outside India. Can I still consult?",
        a: "Yes. Your doctor is registered in India. If you live outside India, a prescription from an Indian doctor may not be accepted by pharmacies in your country. Your doctor will give you a written treatment plan that you can share with your local doctor.",
      },
    ],
    featured: true,
    sortOrder: 3,
    reviewer: "dr-kavita-sharma",
  },
  {
    slug: "psychology",
    name: "Psychology",
    nameHi: "मनोविज्ञान (साइकोलॉजी)",
    icon: "brain",
    shortDescription: "Stress, anxiety, low mood, sleep problems and relationship worries.",
    description:
      "Our psychology team helps with stress, anxiety, low mood, sleep problems and difficulties in relationships. You can talk in private with a clinical psychologist, and a consultant psychiatrist is part of the team when medicine may help. Sessions are online, so you can join from home, in India or abroad.",
    symptoms: ["Stress", "Worry and panic", "Feeling low", "Poor sleep", "Loss of interest", "Anger", "Relationship problems", "Exam or work pressure"],
    treats: ["Anxiety", "Depression", "Insomnia", "Panic attacks", "OCD", "Grief", "Relationship and family issues", "Work stress"],
    faqs: [
      {
        q: "Is it private?",
        a: "Yes. Your notes are seen only by your psychologist or doctor. Calls are encrypted and are not recorded unless you agree.",
      },
      {
        q: "What is the difference between a psychologist and a psychiatrist?",
        a: "A clinical psychologist helps you through talking therapy, such as cognitive behavioural therapy. A psychiatrist is a medical doctor who can also prescribe medicine when it may help. You can start with either, and they work together when needed.",
      },
      {
        q: "Can a psychiatrist prescribe online?",
        a: "Yes, for many medicines. Some medicines are controlled under Indian law and cannot be prescribed in an online consultation. Psychologists do not prescribe medicine.",
      },
      {
        q: "What if I am in crisis?",
        a: "Please do not wait for a booking. If you are thinking about harming yourself, call your local emergency number or go to the nearest hospital now. In India you can also call Tele-MANAS on 14416, free, at any time.",
      },
    ],
    featured: true,
    sortOrder: 4,
    reviewer: "dr-arvind-rao",
  },
];
