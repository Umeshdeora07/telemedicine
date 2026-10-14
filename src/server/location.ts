import "server-only";
import type { PatientLocation } from "./doctors";
import { getCountries } from "./queries/reference";

export function parseLocationParam(v: string | null | undefined): PatientLocation | null {
  if (!v) return null;
  const m = /^([A-Z]{2})(?:-([A-Z0-9]{1,3}))?$/.exec(v.trim().toUpperCase());
  if (!m) return null;
  return { country: m[1]!, region: m[2] ? `${m[1]}-${m[2]}` : null };
}

export function locationParam(loc: PatientLocation) {
  return loc.region ?? loc.country;
}

/** Which patient location to show doctors for: ?for= param, then "Where are you" answer, then account country, then India. */
export function resolveLocation(param: string | undefined, declared: PatientLocation | null, user: { countryCode: string } | null): PatientLocation {
  return parseLocationParam(param) ?? declared ?? (user ? { country: user.countryCode, region: null } : { country: "IN", region: null });
}

export async function describeLocation(loc: PatientLocation) {
  const countries = await getCountries();
  const c = countries.find((x) => x.code === loc.country);
  const region = loc.region ? c?.regions.find((r) => r.code === loc.region)?.name : null;
  return {
    country: c ?? null,
    label: [region, c?.name ?? loc.country].filter(Boolean).join(", "),
    needsRegion: c?.licenceScope === "region" && !loc.region,
    consultsEnabled: Boolean(c?.localConsultsEnabled),
  };
}

export async function locationOptions() {
  const countries = await getCountries();
  return countries
    .filter((c) => c.enabled)
    .map((c) => ({ code: c.code, name: c.name, scope: c.licenceScope as "country" | "region", regions: c.licenceScope === "region" ? c.regions : [], consults: c.localConsultsEnabled }));
}
export type LocationOption = Awaited<ReturnType<typeof locationOptions>>[number];
