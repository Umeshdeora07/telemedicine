/**
 * Indian bodies a doctor or psychologist can be registered with. Doctors on
 * the platform must hold one of these registrations.
 */
export const REGISTRATION_COUNCILS = [
  "National Medical Commission",
  "Andhra Pradesh Medical Council",
  "Arunachal Pradesh Medical Council",
  "Assam Medical Council",
  "Bihar Medical Council",
  "Chhattisgarh Medical Council",
  "Delhi Medical Council",
  "Goa Medical Council",
  "Gujarat Medical Council",
  "Haryana Medical Council",
  "Himachal Pradesh Medical Council",
  "Jammu and Kashmir Medical Council",
  "Jharkhand Medical Council",
  "Karnataka Medical Council",
  "Travancore Cochin Medical Council (Kerala)",
  "Madhya Pradesh Medical Council",
  "Maharashtra Medical Council",
  "Manipur Medical Council",
  "Meghalaya Medical Council",
  "Mizoram Medical Council",
  "Nagaland Medical Council",
  "Odisha Council of Medical Registration",
  "Punjab Medical Council",
  "Rajasthan Medical Council",
  "Sikkim Medical Council",
  "Tamil Nadu Medical Council",
  "Telangana State Medical Council",
  "Tripura State Medical Council",
  "Uttar Pradesh Medical Council",
  "Uttarakhand Medical Council",
  "West Bengal Medical Council",
  "Rehabilitation Council of India (psychologists)",
] as const;

export function isRegistrationCouncil(v: string) {
  return (REGISTRATION_COUNCILS as readonly string[]).includes(v);
}
