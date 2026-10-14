/** Spoken languages for doctor matching (ISO 639-1). */
export const SPOKEN_LANGUAGES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  mr: "Marathi",
  gu: "Gujarati",
  pa: "Punjabi",
  ur: "Urdu",
  or: "Odia",
  as: "Assamese",
  ar: "Arabic",
  fr: "French",
  ru: "Russian",
  sw: "Swahili",
};

export function languageName(code: string) {
  return SPOKEN_LANGUAGES[code] ?? code;
}
