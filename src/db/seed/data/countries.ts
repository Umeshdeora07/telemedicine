import type { EmergencyNumbers } from "@/db/schema";

const US_STATES: [string, string][] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
  ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
  ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"],
  ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
  ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];

const CA_PROVINCES: [string, string][] = [
  ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"],
  ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"], ["NT", "Northwest Territories"], ["NU", "Nunavut"],
  ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"], ["SK", "Saskatchewan"], ["YT", "Yukon"],
];

const AE_EMIRATES: [string, string][] = [
  ["AZ", "Abu Dhabi"], ["DU", "Dubai"], ["SH", "Sharjah"], ["AJ", "Ajman"], ["UQ", "Umm Al Quwain"],
  ["RK", "Ras Al Khaimah"], ["FU", "Fujairah"],
];

const AU_STATES: [string, string][] = [
  ["NSW", "New South Wales"], ["VIC", "Victoria"], ["QLD", "Queensland"], ["WA", "Western Australia"],
  ["SA", "South Australia"], ["TAS", "Tasmania"], ["ACT", "Australian Capital Territory"], ["NT", "Northern Territory"],
];

const IN_STATES: [string, string][] = [
  ["AP", "Andhra Pradesh"], ["AS", "Assam"], ["BR", "Bihar"], ["CT", "Chhattisgarh"], ["DL", "Delhi"], ["GA", "Goa"],
  ["GJ", "Gujarat"], ["HR", "Haryana"], ["HP", "Himachal Pradesh"], ["JH", "Jharkhand"], ["KA", "Karnataka"],
  ["KL", "Kerala"], ["MP", "Madhya Pradesh"], ["MH", "Maharashtra"], ["OR", "Odisha"], ["PB", "Punjab"],
  ["RJ", "Rajasthan"], ["TN", "Tamil Nadu"], ["TG", "Telangana"], ["UP", "Uttar Pradesh"], ["UK", "Uttarakhand"],
  ["WB", "West Bengal"], ["JK", "Jammu and Kashmir"], ["CH", "Chandigarh"], ["PY", "Puducherry"],
];

const regions = (country: string, list: [string, string][]) => list.map(([c, n]) => ({ code: `${country}-${c}`, name: n }));

export type CountrySeed = {
  code: string;
  name: string;
  enabled: boolean;
  localConsultsEnabled: boolean;
  licenceScope: "country" | "region";
  regions: { code: string; name: string }[];
  currency: string;
  languages: string[];
  timeZones: string[];
  phonePrefix: string;
  emergency: EmergencyNumbers;
  allowPreTravelVideo: boolean;
  allowPostReturnFollowUp: "full" | "information_only" | "none";
  legalNotes: string;
};

// Emergency numbers must be re-checked by an admin before each country goes live.
export const COUNTRIES: CountrySeed[] = [
  {
    code: "IN", name: "India", enabled: true, localConsultsEnabled: true, licenceScope: "country",
    regions: regions("IN", IN_STATES), currency: "INR", languages: ["en", "hi", "bn"], timeZones: ["Asia/Kolkata"],
    phonePrefix: "+91",
    emergency: { general: "112", ambulance: "108", police: "112", crisisLine: "14416", crisisLineName: "Tele-MANAS (free, 24×7)" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "full",
    legalNotes: "Telemedicine Practice Guidelines 2020 apply. Any doctor registered with a State Medical Council or the NMC may consult patients anywhere in India.",
  },
  {
    code: "GB", name: "United Kingdom", enabled: true, localConsultsEnabled: true, licenceScope: "country",
    regions: [], currency: "GBP", languages: ["en"], timeZones: ["Europe/London"], phonePrefix: "+44",
    emergency: { general: "999", ambulance: "999", police: "999", crisisLine: "116 123", crisisLineName: "Samaritans (free, 24×7)" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only",
    legalNotes: "DEMO SETTING — confirm with UK counsel: doctors need GMC registration with a licence to practise; CQC registration may apply to the provider. UK GDPR applies.",
  },
  {
    code: "US", name: "United States", enabled: true, localConsultsEnabled: true, licenceScope: "region",
    regions: regions("US", US_STATES), currency: "USD", languages: ["en"],
    timeZones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"], phonePrefix: "+1",
    emergency: { general: "911", ambulance: "911", police: "911", crisisLine: "988", crisisLineName: "988 Suicide & Crisis Lifeline" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only",
    legalNotes: "DEMO SETTING — confirm with US counsel: the doctor must be licensed in the state where the patient is located at the time of the consult. HIPAA may apply.",
  },
  {
    code: "CA", name: "Canada", enabled: true, localConsultsEnabled: false, licenceScope: "region",
    regions: regions("CA", CA_PROVINCES), currency: "USD", languages: ["en", "fr"],
    timeZones: ["America/Toronto", "America/Vancouver"], phonePrefix: "+1",
    emergency: { general: "911", ambulance: "911", police: "911", crisisLine: "988", crisisLineName: "9-8-8 Suicide Crisis Helpline" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only",
    legalNotes: "Not switched on for local consults. Licensing is provincial.",
  },
  {
    code: "AE", name: "United Arab Emirates", enabled: true, localConsultsEnabled: true, licenceScope: "region",
    regions: regions("AE", AE_EMIRATES), currency: "AED", languages: ["en", "ar", "hi"], timeZones: ["Asia/Dubai"],
    phonePrefix: "+971",
    emergency: { general: "999", ambulance: "998", police: "999" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only",
    legalNotes: "DEMO SETTING — confirm with UAE counsel: DHA (Dubai), DOH (Abu Dhabi) and MOHAP (other emirates) license separately.",
  },
  {
    code: "SA", name: "Saudi Arabia", enabled: true, localConsultsEnabled: false, licenceScope: "country",
    regions: [], currency: "AED", languages: ["ar", "en"], timeZones: ["Asia/Riyadh"], phonePrefix: "+966",
    emergency: { general: "911", ambulance: "997", police: "999" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only", legalNotes: "Not switched on for local consults.",
  },
  {
    code: "BD", name: "Bangladesh", enabled: true, localConsultsEnabled: false, licenceScope: "country",
    regions: [], currency: "BDT", languages: ["bn", "en"], timeZones: ["Asia/Dhaka"], phonePrefix: "+880",
    emergency: { general: "999", ambulance: "999", police: "999" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only",
    legalNotes: "Treatment-in-India journey only. Pre-travel case discussion allowed; no diagnosis or prescribing while the patient is in Bangladesh.",
  },
  {
    code: "NP", name: "Nepal", enabled: true, localConsultsEnabled: false, licenceScope: "country",
    regions: [], currency: "USD", languages: ["en", "hi"], timeZones: ["Asia/Kathmandu"], phonePrefix: "+977",
    emergency: { general: "102", ambulance: "102", police: "100" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only", legalNotes: "Treatment-in-India journey only.",
  },
  {
    code: "LK", name: "Sri Lanka", enabled: true, localConsultsEnabled: false, licenceScope: "country",
    regions: [], currency: "USD", languages: ["en"], timeZones: ["Asia/Colombo"], phonePrefix: "+94",
    emergency: { general: "1990", ambulance: "1990", police: "119" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only", legalNotes: "Treatment-in-India journey only.",
  },
  {
    code: "AU", name: "Australia", enabled: true, localConsultsEnabled: false, licenceScope: "country",
    regions: regions("AU", AU_STATES), currency: "USD", languages: ["en"], timeZones: ["Australia/Sydney", "Australia/Perth"],
    phonePrefix: "+61",
    emergency: { general: "000", ambulance: "000", police: "000", crisisLine: "13 11 14", crisisLineName: "Lifeline" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only", legalNotes: "Not switched on for local consults (AHPRA registration required).",
  },
  {
    code: "SG", name: "Singapore", enabled: true, localConsultsEnabled: false, licenceScope: "country",
    regions: [], currency: "USD", languages: ["en"], timeZones: ["Asia/Singapore"], phonePrefix: "+65",
    emergency: { general: "995", ambulance: "995", police: "999" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only", legalNotes: "Not switched on for local consults.",
  },
  {
    code: "DE", name: "Germany", enabled: true, localConsultsEnabled: false, licenceScope: "country",
    regions: [], currency: "EUR", languages: ["en"], timeZones: ["Europe/Berlin"], phonePrefix: "+49",
    emergency: { general: "112", ambulance: "112", police: "110", crisisLine: "0800 111 0 111", crisisLineName: "TelefonSeelsorge" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only", legalNotes: "Not switched on for local consults. GDPR applies.",
  },
  {
    code: "FR", name: "France", enabled: true, localConsultsEnabled: false, licenceScope: "country",
    regions: [], currency: "EUR", languages: ["fr", "en"], timeZones: ["Europe/Paris"], phonePrefix: "+33",
    emergency: { general: "112", ambulance: "15", police: "17", crisisLine: "3114", crisisLineName: "3114 (prévention du suicide)" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only", legalNotes: "Not switched on for local consults. GDPR applies.",
  },
  {
    code: "KE", name: "Kenya", enabled: true, localConsultsEnabled: false, licenceScope: "country",
    regions: [], currency: "USD", languages: ["sw", "en"], timeZones: ["Africa/Nairobi"], phonePrefix: "+254",
    emergency: { general: "999", ambulance: "999", police: "999" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only", legalNotes: "Treatment-in-India journey only.",
  },
  {
    code: "NG", name: "Nigeria", enabled: true, localConsultsEnabled: false, licenceScope: "country",
    regions: [], currency: "USD", languages: ["en"], timeZones: ["Africa/Lagos"], phonePrefix: "+234",
    emergency: { general: "112", ambulance: "112", police: "112" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only", legalNotes: "Treatment-in-India journey only.",
  },
  {
    code: "OM", name: "Oman", enabled: true, localConsultsEnabled: false, licenceScope: "country",
    regions: [], currency: "AED", languages: ["ar", "en"], timeZones: ["Asia/Muscat"], phonePrefix: "+968",
    emergency: { general: "9999", ambulance: "9999", police: "9999" },
    allowPreTravelVideo: true, allowPostReturnFollowUp: "information_only", legalNotes: "Treatment-in-India journey only.",
  },
  {
    code: "RU", name: "Russia", enabled: false, localConsultsEnabled: false, licenceScope: "country",
    regions: [], currency: "USD", languages: ["ru"], timeZones: ["Europe/Moscow"], phonePrefix: "+7",
    emergency: { general: "112", ambulance: "103", police: "102" },
    allowPreTravelVideo: false, allowPostReturnFollowUp: "none", legalNotes: "Switched off.",
  },
];

// Demo exchange rates (1 INR = rate). Refresh from Admin → Countries & currencies.
export const DEMO_FX: Record<string, number> = {
  INR: 1,
  USD: 0.01124,
  EUR: 0.00968,
  GBP: 0.00843,
  AED: 0.04128,
  BDT: 1.3713,
};
