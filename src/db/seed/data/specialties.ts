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
  startingFeeMinor: number;
  featured: boolean;
  sortOrder: number;
  reviewer: string; // doctor slug
};

export const SPECIALTIES: SpecialtySeed[] = [
  {
    slug: "general-physician",
    name: "General physician",
    nameHi: "सामान्य चिकित्सक",
    icon: "stethoscope",
    shortDescription: "Fever, cough, stomach upsets, infections and everyday health worries.",
    description:
      "A general physician is the right first doctor for most new health problems. They look after common illnesses, long-term conditions, medicine reviews and general check-ups, and send you to a specialist when needed.",
    symptoms: ["Fever", "Cough and cold", "Sore throat", "Acidity", "Loose motions", "Body ache", "Headache", "Tiredness", "Urine infection"],
    treats: ["Viral fever", "Common cold and flu", "Gastritis", "Food poisoning", "Urinary tract infection", "Seasonal allergies"],
    faqs: [
      { q: "Can a general physician treat me online?", a: "Yes, for many common problems such as fever, cough, acidity or a medicine review. If the doctor needs to examine you or order tests, they will tell you and help you book a clinic visit." },
      { q: "Will I get a prescription?", a: "If it is safe to treat you online, the doctor can send an e-prescription. Some medicines can only be prescribed in a video consult or at a clinic visit, as India's telemedicine rules require." },
      { q: "When should I not book online?", a: "If you have chest pain, trouble breathing, signs of a stroke, heavy bleeding or a severe allergic reaction, call 112 or go to the nearest hospital straight away." },
    ],
    startingFeeMinor: 19900,
    featured: true,
    sortOrder: 1,
    reviewer: "dr-kavita-sharma",
  },
  {
    slug: "paediatrics",
    name: "Child specialist (paediatrics)",
    nameHi: "बाल रोग विशेषज्ञ",
    icon: "baby",
    shortDescription: "Health, growth, vaccines and illnesses in babies, children and teens.",
    description:
      "A paediatrician cares for children from birth to 18 years: fevers and infections, feeding and growth, vaccines, rashes, allergies and development. A parent or guardian must be present for every consult with a child.",
    symptoms: ["Fever in a child", "Cough", "Loose motions", "Vomiting", "Rash", "Poor feeding", "Ear pain"],
    treats: ["Childhood fevers", "Diarrhoea and dehydration", "Asthma in children", "Skin rashes", "Growth and nutrition", "Vaccination advice"],
    faqs: [
      { q: "Do I need to be present for my child's consult?", a: "Yes. A parent or guardian must be present for the whole consult with anyone under 18." },
      { q: "My baby is under 3 months and has a fever. Can I consult online?", a: "A fever in a baby under 3 months needs to be seen in person urgently. Please go to the nearest hospital or call 112." },
      { q: "Can the doctor check my child's vaccine schedule?", a: "Yes. Keep the vaccination card ready and upload a photo before the consult." },
    ],
    startingFeeMinor: 39900,
    featured: true,
    sortOrder: 2,
    reviewer: "dr-meenakshi-sundaram",
  },
  {
    slug: "gynaecology",
    name: "Women's health (gynaecology)",
    nameHi: "स्त्री रोग विशेषज्ञ",
    icon: "flower-2",
    shortDescription: "Periods, pregnancy, PCOS, menopause and contraception.",
    description:
      "Gynaecologists and obstetricians care for women's reproductive health: period problems, PCOS, pregnancy planning and care, contraception, infections and menopause. You can ask for a woman doctor.",
    symptoms: ["Irregular periods", "Painful periods", "White discharge", "Missed period", "Pelvic pain", "Hot flushes"],
    treats: ["PCOS", "Pregnancy care", "Menstrual problems", "Vaginal infections", "Menopause", "Contraception advice"],
    faqs: [
      { q: "Can I choose a woman doctor?", a: "Yes. Use the gender filter on the search page, or pick 'Woman doctor' when you use Consult now." },
      { q: "Is my consult private?", a: "Yes. Calls are encrypted, recording is off unless you agree, and only your doctor sees your notes." },
      { q: "When is a clinic visit needed?", a: "For internal examinations, scans, or if you are pregnant and have bleeding or severe pain. Bleeding with severe pain in pregnancy is an emergency: call 112." },
    ],
    startingFeeMinor: 44900,
    featured: true,
    sortOrder: 3,
    reviewer: "dr-shalini-reddy",
  },
  {
    slug: "dermatology",
    name: "Skin and hair (dermatology)",
    nameHi: "त्वचा और बाल विशेषज्ञ",
    icon: "scan-face",
    shortDescription: "Acne, rashes, eczema, hair fall, fungal infections and nail problems.",
    description:
      "Dermatologists treat problems of the skin, hair and nails. Skin problems are well suited to video consults: good light and clear photos help the doctor see what is going on.",
    symptoms: ["Acne", "Itching", "Rash", "Hair fall", "Dandruff", "Dark patches", "Fungal infection"],
    treats: ["Acne", "Eczema", "Psoriasis", "Fungal infections", "Hair loss", "Pigmentation"],
    faqs: [
      { q: "Should I send photos?", a: "Yes. Take clear photos in daylight, close up and from a little further away, and upload them in the pre-consult form." },
      { q: "Can I get treatment online?", a: "Many skin problems can be treated online. Some need a clinic visit for a closer look or a small test." },
    ],
    startingFeeMinor: 39900,
    featured: true,
    sortOrder: 4,
    reviewer: "dr-nikhil-menon",
  },
  {
    slug: "cardiology",
    name: "Heart (cardiology)",
    nameHi: "हृदय रोग विशेषज्ञ",
    icon: "heart-pulse",
    shortDescription: "Blood pressure, cholesterol, palpitations and heart check-ups.",
    description:
      "Cardiologists look after the heart and blood vessels: high blood pressure, cholesterol, palpitations, heart failure and care after a heart procedure. Chest pain that is new, severe or spreading is an emergency: call 112.",
    symptoms: ["High blood pressure", "Palpitations", "Breathlessness on walking", "Swelling of feet", "High cholesterol"],
    treats: ["Hypertension", "High cholesterol", "Heart failure follow-up", "After angioplasty or bypass", "Irregular heartbeat"],
    faqs: [
      { q: "I have chest pain. Should I book a consult?", a: "No. New, severe or spreading chest pain, or chest pain with sweating or breathlessness, is an emergency. Call 112 or go to the nearest hospital now." },
      { q: "What should I keep ready?", a: "Recent blood pressure readings, ECG or echo reports, and the list of medicines you take." },
    ],
    startingFeeMinor: 69900,
    featured: true,
    sortOrder: 5,
    reviewer: "dr-rajesh-iyer",
  },
  {
    slug: "orthopaedics",
    name: "Bones and joints (orthopaedics)",
    nameHi: "हड्डी और जोड़ विशेषज्ञ",
    icon: "bone",
    shortDescription: "Joint pain, back pain, sports injuries, arthritis and fractures.",
    description:
      "Orthopaedic doctors treat bones, joints, muscles and ligaments. Online consults work well to review X-rays and MRI reports, plan treatment and decide whether you need a clinic visit or surgery.",
    symptoms: ["Knee pain", "Back pain", "Neck pain", "Shoulder pain", "Joint swelling", "Sports injury"],
    treats: ["Osteoarthritis", "Slipped disc", "Frozen shoulder", "Ligament injuries", "Joint replacement planning"],
    faqs: [
      { q: "Can I share my X-ray or MRI?", a: "Yes. Upload the report and the images before the consult, or share them in the call." },
      { q: "Do I need a clinic visit?", a: "Often an examination helps. The doctor can book you into their clinic with one tap after the online consult." },
    ],
    startingFeeMinor: 49900,
    featured: true,
    sortOrder: 6,
    reviewer: "dr-harpreet-gill",
  },
  {
    slug: "psychiatry",
    name: "Mental health (psychiatry)",
    nameHi: "मानसिक स्वास्थ्य",
    icon: "brain",
    shortDescription: "Anxiety, low mood, sleep problems, stress and addiction.",
    description:
      "Psychiatrists help with anxiety, depression, sleep problems, stress, OCD, bipolar disorder and addiction. Consults are private. If you are thinking about harming yourself, call 112 or Tele-MANAS on 14416 now.",
    symptoms: ["Feeling low", "Worry and panic", "Poor sleep", "Loss of interest", "Anger", "Alcohol or drug use"],
    treats: ["Depression", "Anxiety", "Insomnia", "OCD", "Bipolar disorder", "De-addiction support"],
    faqs: [
      { q: "Is it private?", a: "Yes. Your notes are only shown to your doctor, and to others only if you agree." },
      { q: "Can a psychiatrist prescribe online?", a: "Some medicines can be prescribed online. Medicines that are controlled under Indian law cannot be prescribed through teleconsultation." },
      { q: "I am in crisis. What should I do?", a: "Call 112, or Tele-MANAS on 14416 (free, 24×7, many languages), or go to the nearest hospital." },
    ],
    startingFeeMinor: 59900,
    featured: true,
    sortOrder: 7,
    reviewer: "dr-arvind-rao",
  },
  {
    slug: "endocrinology",
    name: "Diabetes and thyroid (endocrinology)",
    nameHi: "मधुमेह और थायरॉइड",
    icon: "droplet",
    shortDescription: "Diabetes, thyroid problems, hormones and weight.",
    description:
      "Endocrinologists treat diabetes, thyroid problems, PCOS, obesity and other hormone conditions. Regular online check-ins with your sugar or thyroid readings are a good way to stay on track.",
    symptoms: ["High sugar", "Excess thirst", "Weight gain", "Weight loss", "Tiredness", "Neck swelling"],
    treats: ["Type 2 diabetes", "Type 1 diabetes", "Hypothyroidism", "Hyperthyroidism", "Obesity", "PCOS (hormonal care)"],
    faqs: [
      { q: "What should I share before the consult?", a: "Your recent HbA1c, fasting and after-meal sugar readings, thyroid tests (TSH), and your medicine list." },
      { q: "Is there a plan for regular care?", a: "Yes. Our diabetes and thyroid care plans include monthly check-ins and a readings log your doctor can see." },
    ],
    startingFeeMinor: 59900,
    featured: true,
    sortOrder: 8,
    reviewer: "dr-prakash-venkatesh",
  },
];

export type ConditionSeed = {
  slug: string;
  name: string;
  specialty: string;
  summary: string;
  symptoms: string[];
  whenToSeeDoctor: string;
  body: string;
  faqs: Faq[];
};

const emergencyLine =
  "**Get emergency help now (call 112 in India)** if there is chest pain, trouble breathing, fainting, signs of a stroke (face drooping, arm weakness, slurred speech), heavy bleeding or a severe allergic reaction.";

export const CONDITIONS: ConditionSeed[] = [
  {
    slug: "fever-in-adults",
    name: "Fever in adults",
    specialty: "general-physician",
    summary: "Most fevers are caused by viral infections and settle in 2 to 3 days. Some need tests or treatment.",
    symptoms: ["Temperature of 100.4 °F (38 °C) or more", "Chills", "Body ache", "Headache", "Tiredness"],
    whenToSeeDoctor: "Fever for more than 2 days, very high fever (103 °F or more), rash, severe headache, or if you have diabetes, are pregnant or are over 65.",
    body: `## What it is
A fever is your body's way of fighting an infection. Common causes in India include viral fever, dengue, malaria, typhoid and urine infections.

## What you can do at home
- Rest and drink plenty of fluids: water, ORS, soups, coconut water.
- Paracetamol can bring the temperature down. Follow the dose on the pack and do not exceed it.
- Avoid painkillers like ibuprofen or aspirin until dengue has been ruled out.

## When to consult a doctor
See a doctor if the fever lasts more than 2 days, keeps coming back, or comes with a rash, vomiting, belly pain or burning urine. The doctor may suggest blood tests such as a CBC, dengue or malaria test.

## When it is an emergency
${emergencyLine} Also go to hospital for confusion, a stiff neck, bleeding gums or very little urine.`,
    faqs: [
      { q: "Can a doctor treat fever online?", a: "Yes, in many cases. The doctor will ask about your symptoms, may order tests, and will tell you if you need to be seen in person." },
      { q: "Should I take antibiotics for fever?", a: "Only if a doctor prescribes them. Most fevers are viral and antibiotics do not help." },
    ],
  },
  {
    slug: "cough-and-cold",
    name: "Cough and cold",
    specialty: "general-physician",
    summary: "Usually a viral infection that gets better on its own in 7 to 10 days.",
    symptoms: ["Runny or blocked nose", "Sneezing", "Sore throat", "Cough", "Mild fever"],
    whenToSeeDoctor: "Cough for more than 3 weeks, high fever, chest pain, blood in sputum, or breathlessness.",
    body: `## What you can do at home
- Warm fluids, steam inhalation and salt-water gargles ease symptoms.
- Rest and sleep well.
- Paracetamol helps with fever and body ache.

## When to consult a doctor
If you have a cough for more than 3 weeks, cough up blood, have a high fever for more than 2 days, or have asthma or COPD that is getting worse.

## When it is an emergency
${emergencyLine}`,
    faqs: [{ q: "Do I need antibiotics?", a: "Usually not. Colds are caused by viruses. Your doctor will decide if an antibiotic is needed." }],
  },
  {
    slug: "fever-in-children",
    name: "Fever in children",
    specialty: "paediatrics",
    summary: "Fever is common in children and is usually caused by a viral infection. Watch how your child is behaving.",
    symptoms: ["Temperature of 100.4 °F (38 °C) or more", "Irritability", "Poor feeding", "Sleepiness"],
    whenToSeeDoctor: "Fever for more than 2 days, poor feeding, fewer wet nappies, or if you are worried.",
    body: `## What you can do at home
- Give plenty of fluids and keep your child lightly dressed.
- Paracetamol syrup can be given by weight. Use the measuring cup that comes with the bottle.
- Do not sponge with cold water or give aspirin to children.

## When to consult a doctor
If the fever lasts more than 2 days, your child is not drinking, has fewer wet nappies, has ear pain, or a rash.

## Get emergency help now
- A baby under 3 months with any fever.
- A fit (seizure), unusual drowsiness, difficulty waking, or a stiff neck.
- Fast or difficult breathing, blue lips, or a rash that does not fade when pressed with a glass.
Call 112 or go to the nearest hospital.`,
    faqs: [{ q: "Must I be present for the consult?", a: "Yes. A parent or guardian must be present for every consult with a child." }],
  },
  {
    slug: "diarrhoea-in-children",
    name: "Loose motions in children",
    specialty: "paediatrics",
    summary: "Loose motions are usually caused by an infection and get better in a few days. The main risk is dehydration.",
    symptoms: ["Watery stools", "Vomiting", "Tummy cramps", "Fever"],
    whenToSeeDoctor: "Loose motions for more than 2 days, blood in stools, or signs of dehydration.",
    body: `## What you can do at home
- Give ORS after every loose stool. Keep breastfeeding babies.
- Zinc tablets for 14 days are recommended for children with diarrhoea in India; ask your doctor for the dose.
- Continue normal food in small amounts.

## Signs of dehydration — see a doctor today
Dry mouth, no tears, sunken eyes, fewer wet nappies, unusual sleepiness.

## Get emergency help now
If your child is very drowsy, cannot drink, has blood in stools with high fever, or has not passed urine for 6 hours or more.`,
    faqs: [{ q: "Should I stop milk?", a: "No. Keep breastfeeding and normal feeds unless your doctor advises otherwise." }],
  },
  {
    slug: "pcos",
    name: "PCOS (polycystic ovary syndrome)",
    specialty: "gynaecology",
    summary: "A common hormone condition that can cause irregular periods, acne, extra hair growth and weight gain.",
    symptoms: ["Irregular or missed periods", "Acne", "Extra facial or body hair", "Weight gain", "Difficulty getting pregnant"],
    whenToSeeDoctor: "Irregular periods for 3 months or more, or difficulty getting pregnant after 12 months of trying.",
    body: `## What it is
PCOS affects how the ovaries work. It is common and can be managed well.

## How it is treated
Treatment depends on your goals: regular periods, skin and hair care, weight, or pregnancy. Healthy eating, regular exercise and weight loss (if overweight) help a lot. Your doctor may suggest tests such as an ultrasound and blood tests.

## How an online consult helps
You can discuss symptoms, review reports, and start or adjust treatment. The doctor may book a clinic visit for an ultrasound.`,
    faqs: [{ q: "Can PCOS be cured?", a: "It cannot be cured, but symptoms can be controlled well with lifestyle changes and treatment." }],
  },
  {
    slug: "pregnancy-care",
    name: "Pregnancy care",
    specialty: "gynaecology",
    summary: "Regular check-ups keep you and your baby healthy. Online consults are useful for questions and report reviews between clinic visits.",
    symptoms: ["Missed period", "Nausea", "Tiredness", "Breast tenderness"],
    whenToSeeDoctor: "Book your first check-up as soon as you know you are pregnant.",
    body: `## What online consults are good for
- Questions about diet, medicines and symptoms.
- Reviewing scan and blood test reports.
- Planning your clinic visits and scans.

## Go to hospital now if you have
- Bleeding from the vagina, or leaking fluid.
- Severe belly pain, severe headache, blurred vision or swelling of the face and hands.
- Baby moving less than usual (after 28 weeks).
- Fever with shivering.`,
    faqs: [{ q: "Can I get my scans done through you?", a: "Your doctor can book you into a partner clinic or hospital for scans." }],
  },
  {
    slug: "acne",
    name: "Acne (pimples)",
    specialty: "dermatology",
    summary: "Very common, especially in teens and young adults. Treatment works but takes 6 to 12 weeks.",
    symptoms: ["Pimples", "Blackheads and whiteheads", "Painful lumps", "Dark marks after pimples"],
    whenToSeeDoctor: "If acne is painful, leaves marks or scars, or has not improved with over-the-counter care.",
    body: `## What you can do
- Wash your face twice a day with a gentle cleanser. Do not scrub.
- Do not squeeze or pick pimples.
- Use oil-free, non-comedogenic products and sunscreen.

## How an online consult helps
Send clear photos in daylight. The dermatologist can start creams or tablets and follow up online.`,
    faqs: [{ q: "Does diet cause acne?", a: "Diet plays a small role for some people. Hormones, genes and skin care matter more." }],
  },
  {
    slug: "eczema",
    name: "Eczema (atopic dermatitis)",
    specialty: "dermatology",
    summary: "Dry, itchy, inflamed skin that comes and goes. Common in children and people with allergies.",
    symptoms: ["Dry skin", "Itching", "Red patches", "Thickened skin", "Oozing in flare-ups"],
    whenToSeeDoctor: "If itching disturbs sleep, the skin is infected (yellow crusts, pus), or creams are not helping.",
    body: `## What you can do
- Moisturise at least twice a day, especially after bathing.
- Use mild soap and lukewarm water.
- Wear soft cotton clothes and avoid known triggers.

## How an online consult helps
The doctor can see the rash on video or in photos, prescribe creams, and plan follow-up.`,
    faqs: [{ q: "Is eczema contagious?", a: "No. You cannot catch eczema from someone." }],
  },
  {
    slug: "high-blood-pressure",
    name: "High blood pressure (hypertension)",
    specialty: "cardiology",
    summary: "Often has no symptoms but raises the risk of heart attack, stroke and kidney disease. Treatment and home monitoring work well.",
    symptoms: ["Often none", "Headache", "Dizziness"],
    whenToSeeDoctor: "Readings of 140/90 or higher on several days, or if you are on treatment and readings stay high.",
    body: `## Check your blood pressure at home
Sit quietly for 5 minutes, arm supported at heart level. Take 2 readings a minute apart, morning and evening, for a week, and log them in your records.

## Living well with high blood pressure
- Less salt, more fruit and vegetables.
- 30 minutes of walking most days.
- Stop smoking and limit alcohol.
- Take medicines every day, even when you feel well.

## Get emergency help now
Blood pressure of 180/120 or higher **with** chest pain, breathlessness, weakness, confusion or severe headache. Call 112.`,
    faqs: [{ q: "Can I stop my medicine when my BP is normal?", a: "No. Normal readings usually mean the medicine is working. Talk to your doctor before making any change." }],
  },
  {
    slug: "high-cholesterol",
    name: "High cholesterol",
    specialty: "cardiology",
    summary: "High levels of LDL ('bad') cholesterol increase the risk of heart disease. It is found with a blood test.",
    symptoms: ["Usually none"],
    whenToSeeDoctor: "If a lipid profile shows high LDL or triglycerides, or you have a family history of early heart disease.",
    body: `## What helps
- Eat less fried food, ghee and red meat; more whole grains, nuts, fruit and vegetables.
- Exercise regularly and keep a healthy weight.
- Your doctor may suggest a statin based on your overall heart risk.

## How an online consult helps
Share your lipid profile and the doctor will explain your risk and treatment in simple words.`,
    faqs: [{ q: "How often should I test?", a: "Usually every 1 to 5 years depending on your risk; more often if you are on treatment." }],
  },
  {
    slug: "knee-pain",
    name: "Knee pain",
    specialty: "orthopaedics",
    summary: "Common causes are osteoarthritis, injury and overuse. Most knee pain improves with exercise and treatment.",
    symptoms: ["Pain on walking or climbing stairs", "Stiffness", "Swelling", "Clicking or locking"],
    whenToSeeDoctor: "Pain for more than 2 weeks, swelling, or the knee gives way.",
    body: `## What you can do
- Gentle exercises to strengthen the thigh muscles help most people.
- Keep a healthy weight to reduce load on the knees.
- An ice pack for swelling; a warm pack for stiffness.

## When surgery is considered
Knee replacement is considered when arthritis is severe and other treatments have not helped. Your orthopaedic doctor will discuss options, and can arrange a clinic visit and X-rays.

## Go to hospital now if
The knee is hot, red and swollen with fever, or you cannot bear weight after an injury.`,
    faqs: [{ q: "Is knee replacement safe?", a: "It is a common and usually successful operation. Your surgeon will explain the benefits and risks for you." }],
  },
  {
    slug: "back-pain",
    name: "Back pain",
    specialty: "orthopaedics",
    summary: "Most back pain gets better in a few weeks. Staying active helps recovery.",
    symptoms: ["Lower back pain", "Stiffness", "Pain going down the leg"],
    whenToSeeDoctor: "Pain for more than 2 weeks, pain going down the leg, or numbness.",
    body: `## What helps
- Keep moving gently; long bed rest slows recovery.
- Heat packs and paracetamol for pain.
- Good posture at work and regular breaks.

## Get emergency help now
Back pain with loss of control of bladder or bowels, numbness between the legs, or weakness in both legs. Go to hospital immediately.`,
    faqs: [{ q: "Do I need an MRI?", a: "Most people do not. Your doctor will advise if tests are needed." }],
  },
  {
    slug: "anxiety",
    name: "Anxiety",
    specialty: "psychiatry",
    summary: "Feeling worried, tense or panicky most days. Anxiety is common and treatable.",
    symptoms: ["Constant worry", "Restlessness", "Racing heart", "Poor sleep", "Panic attacks"],
    whenToSeeDoctor: "If worry affects your work, relationships or sleep for more than a few weeks.",
    body: `## What helps
- Talking therapies (such as CBT) and, for some people, medicines.
- Regular exercise, sleep routine and less caffeine.
- Breathing exercises during a panic attack: breathe in for 4, hold for 4, out for 6.

## If you are in crisis
If you have thoughts of harming yourself, call 112 or Tele-MANAS on **14416** (free, 24×7), or go to the nearest hospital.`,
    faqs: [{ q: "Will I need medicines?", a: "Not always. Your doctor will discuss therapy, self-help and medicines with you." }],
  },
  {
    slug: "depression",
    name: "Depression",
    specialty: "psychiatry",
    summary: "Low mood, loss of interest and tiredness lasting two weeks or more. It is an illness, not a weakness, and it can be treated.",
    symptoms: ["Low mood", "Loss of interest", "Tiredness", "Sleep and appetite changes", "Feeling worthless"],
    whenToSeeDoctor: "If you have felt low most days for 2 weeks or more.",
    body: `## Treatment works
Talking therapy, medicines, or both. Most people feel better with treatment.

## Small steps that help
- Keep a daily routine, get daylight and move a little every day.
- Stay in touch with people you trust.

## If you are in crisis
If you have thoughts of harming yourself, call 112 or Tele-MANAS on **14416** now, or go to the nearest hospital.`,
    faqs: [{ q: "Is it private?", a: "Yes. Your consult and notes are private to you and your doctor." }],
  },
  {
    slug: "diabetes",
    name: "Type 2 diabetes",
    specialty: "endocrinology",
    summary: "High blood sugar that can be controlled with diet, exercise and medicines. Good control prevents complications.",
    symptoms: ["Excess thirst", "Passing urine often", "Tiredness", "Slow-healing wounds", "Often none"],
    whenToSeeDoctor: "If your fasting sugar is 126 mg/dL or more, HbA1c is 6.5% or more, or readings stay high on treatment.",
    body: `## Keep track
Check your sugar as your doctor advises and log readings in your records. Get HbA1c tested every 3 months until stable.

## Living well with diabetes
- Balanced meals with fewer sweets, refined flour and sugary drinks.
- 150 minutes of activity a week.
- Daily foot checks, yearly eye and kidney checks.

## Get emergency help now
Very high sugar with vomiting, drowsiness or fast breathing; or low sugar (below 70 mg/dL) that does not improve after taking sugar, or with confusion or fainting.`,
    faqs: [{ q: "Is there a diabetes care plan?", a: "Yes. The diabetes care plan includes monthly check-ins and a readings log your doctor can see." }],
  },
  {
    slug: "thyroid",
    name: "Hypothyroidism (underactive thyroid)",
    specialty: "endocrinology",
    summary: "The thyroid gland makes too little hormone. Daily tablets work well.",
    symptoms: ["Tiredness", "Weight gain", "Feeling cold", "Dry skin", "Constipation", "Low mood"],
    whenToSeeDoctor: "If your TSH test is high, or you have symptoms.",
    body: `## Treatment
Usually a daily tablet (levothyroxine) taken on an empty stomach, 30 to 60 minutes before breakfast. Your doctor checks TSH 6 to 8 weeks after any dose change.

## How an online consult helps
Share your TSH report and the doctor can adjust your dose without a clinic visit in most cases.`,
    faqs: [{ q: "Can I stop the tablet when I feel better?", a: "No. Most people need it long term. Talk to your doctor before any change." }],
  },
];
