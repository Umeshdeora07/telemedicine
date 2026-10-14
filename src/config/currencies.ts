export const CURRENCIES = {
  INR: { symbol: "₹", name: "Indian rupee", decimals: 2 },
  USD: { symbol: "$", name: "US dollar", decimals: 2 },
  EUR: { symbol: "€", name: "Euro", decimals: 2 },
  GBP: { symbol: "£", name: "British pound", decimals: 2 },
  AED: { symbol: "AED", name: "UAE dirham", decimals: 2 },
  BDT: { symbol: "৳", name: "Bangladeshi taka", decimals: 2 },
} as const;

export type Currency = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as Currency[];
export const BASE_CURRENCY: Currency = "INR";

export function isCurrency(v: unknown): v is Currency {
  return typeof v === "string" && v in CURRENCIES;
}

/** Sensible default currency for a country (ISO 3166-1 alpha-2). */
export function currencyForCountry(country: string | null | undefined): Currency {
  switch ((country || "").toUpperCase()) {
    case "IN":
      return "INR";
    case "US":
    case "CA":
      return "USD";
    case "GB":
      return "GBP";
    case "AE":
    case "SA":
    case "OM":
    case "QA":
    case "KW":
    case "BH":
      return "AED";
    case "BD":
      return "BDT";
    case "DE":
    case "FR":
    case "IT":
    case "ES":
    case "NL":
    case "IE":
    case "BE":
    case "PT":
    case "AT":
    case "FI":
      return "EUR";
    default:
      return "USD";
  }
}
