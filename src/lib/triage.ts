/**
 * Triage helper: a short, rule-based questionnaire that suggests which kind
 * of doctor to see and how soon. It never diagnoses or advises treatment. The
 * answers are shared with the doctor. Rules should be reviewed by the
 * clinical team before launch.
 */

export const RED_FLAGS = [
  { id: "chest_pain", label: "Chest pain or pressure, especially if it spreads to the arm, jaw or back, or comes with sweating" },
  { id: "breathing", label: "Severe difficulty breathing, or lips or face turning blue" },
  { id: "stroke", label: "Face drooping, weakness in an arm or leg, or slurred speech" },
  { id: "bleeding", label: "Heavy bleeding that won't stop" },
  { id: "self_harm", label: "Thoughts of harming yourself or ending your life" },
  { id: "allergy", label: "Swelling of the face, lips or tongue, or a severe allergic reaction" },
  { id: "unconscious", label: "Fainting, a fit (seizure), or being very hard to wake up" },
  { id: "pregnancy", label: "Pregnant with heavy bleeding, severe belly pain, or leaking fluid" },
  { id: "injury", label: "A serious injury, burn, poisoning or accident" },
  { id: "baby_fever", label: "A baby under 3 months old with a fever" },
] as const;

export type RedFlagId = (typeof RED_FLAGS)[number]["id"];

export const AREAS = [
  { id: "fever", label: "Fever or infection", icon: "thermometer" },
  { id: "breathing", label: "Cough, cold or breathing", icon: "wind" },
  { id: "stomach", label: "Stomach, digestion or urine", icon: "soup" },
  { id: "skin", label: "Skin, hair or nails", icon: "scan-face" },
  { id: "heart", label: "Heart, blood pressure or cholesterol", icon: "heart-pulse" },
  { id: "bones", label: "Bones, joints, back or muscles", icon: "bone" },
  { id: "mood", label: "Mood, stress, sleep or anxiety", icon: "brain" },
  { id: "women", label: "Periods, pregnancy or women's health", icon: "flower-2" },
  { id: "hormones", label: "Sugar, thyroid or weight", icon: "droplet" },
  { id: "other", label: "Something else", icon: "stethoscope" },
] as const;
export type AreaId = (typeof AREAS)[number]["id"];

export const AGE_GROUPS = [
  { id: "baby", label: "Baby (under 1 year)" },
  { id: "child", label: "Child (1–12 years)" },
  { id: "teen", label: "Teenager (13–17 years)" },
  { id: "adult", label: "Adult (18–64 years)" },
  { id: "older", label: "Older adult (65+ years)" },
] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number]["id"];

export const DURATIONS = [
  { id: "today", label: "Started today" },
  { id: "days", label: "1 to 3 days" },
  { id: "weeks", label: "4 days to 2 weeks" },
  { id: "long", label: "More than 2 weeks" },
] as const;
export type Duration = (typeof DURATIONS)[number]["id"];

export const SEVERITIES = [
  { id: "mild", label: "Mild — I can do my usual activities" },
  { id: "moderate", label: "Moderate — it's affecting my day" },
  { id: "severe", label: "Severe — I can't do normal activities" },
] as const;
export type Severity = (typeof SEVERITIES)[number]["id"];

/** One or two extra yes/no questions for some areas. "now" answers raise urgency. */
export const FOLLOW_UPS: Partial<Record<AreaId, { id: string; label: string; ifYes: "emergency" | "now" | "today" }[]>> = {
  fever: [
    { id: "stiff_neck", label: "Stiff neck, confusion, or a rash that doesn't fade when pressed with a glass?", ifYes: "emergency" },
    { id: "high_fever", label: "Temperature of 103 °F (39.4 °C) or more, or fever for more than 3 days?", ifYes: "today" },
  ],
  breathing: [
    { id: "breathless_rest", label: "Breathless while resting or speaking?", ifYes: "now" },
    { id: "blood_cough", label: "Coughing up blood, or cough for more than 3 weeks?", ifYes: "today" },
  ],
  stomach: [
    { id: "blood_stool", label: "Blood in vomit or stool, or black stools?", ifYes: "now" },
    { id: "cant_keep_fluids", label: "Can't keep fluids down, or passing very little urine?", ifYes: "today" },
  ],
  heart: [{ id: "bp_high", label: "A blood pressure reading of 180/120 or higher?", ifYes: "today" }],
  hormones: [{ id: "sugar_extreme", label: "Sugar reading above 300 mg/dL or below 70 mg/dL?", ifYes: "today" }],
  women: [{ id: "pregnant", label: "Are you pregnant?", ifYes: "today" }],
  mood: [{ id: "no_sleep", label: "Not able to sleep or eat for several days?", ifYes: "today" }],
};

export type Urgency = "emergency" | "now" | "today" | "this_week";

export type TriageAnswers = {
  age: AgeGroup;
  redFlags: string[];
  area: AreaId;
  duration: Duration;
  severity: Severity;
  followUps: Record<string, boolean>;
};

const AREA_SPECIALTY: Record<AreaId, string> = {
  fever: "general-physician",
  breathing: "general-physician",
  stomach: "general-physician",
  skin: "dermatology",
  heart: "cardiology",
  bones: "orthopaedics",
  mood: "psychiatry",
  women: "gynaecology",
  hormones: "endocrinology",
  other: "general-physician",
};

const RANK: Record<Urgency, number> = { this_week: 0, today: 1, now: 2, emergency: 3 };
const max = (a: Urgency, b: Urgency) => (RANK[a] >= RANK[b] ? a : b);

export function triage(a: TriageAnswers): { urgency: Urgency; specialtySlug: string; reasons: string[] } {
  const reasons: string[] = [];
  if (a.redFlags.length) return { urgency: "emergency", specialtySlug: AREA_SPECIALTY[a.area], reasons: ["You reported a warning sign that needs emergency care."] };
  let urgency: Urgency = "this_week";
  if (a.severity === "severe") {
    urgency = "now";
    reasons.push("Severe symptoms should be seen as soon as possible.");
  } else if (a.severity === "moderate") {
    urgency = max(urgency, a.duration === "long" ? "this_week" : "today");
    if (a.duration !== "long") reasons.push("Symptoms affecting your day are best seen today.");
  }
  for (const q of FOLLOW_UPS[a.area] ?? []) {
    if (a.followUps[q.id]) {
      urgency = max(urgency, q.ifYes);
      reasons.push(q.ifYes === "emergency" ? "One of your answers needs emergency care." : "One of your answers means you should be seen soon.");
    }
  }
  if ((a.age === "baby" || a.age === "older") && (a.area === "fever" || a.area === "breathing" || a.area === "stomach")) {
    urgency = max(urgency, "today");
    reasons.push(a.age === "baby" ? "Babies with these symptoms should be seen today." : "Older adults with these symptoms should be seen today.");
  }
  if (a.duration === "long" && a.severity === "mild" && urgency === "this_week") reasons.push("Long-lasting but mild symptoms can be seen this week.");
  let specialtySlug = AREA_SPECIALTY[a.area];
  if ((a.age === "baby" || a.age === "child" || a.age === "teen") && ["fever", "breathing", "stomach", "other", "skin"].includes(a.area)) {
    specialtySlug = a.area === "skin" && a.age === "teen" ? "dermatology" : "paediatrics";
  }
  if (!reasons.length) reasons.push("Your answers don't suggest an emergency.");
  return { urgency, specialtySlug, reasons };
}

/** Compact, URL-safe form so the answers can travel into the booking. */
export function encodeTriage(v: unknown) {
  return Buffer.from(JSON.stringify(v)).toString("base64url");
}
export function decodeTriage<T>(s: string | undefined | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
