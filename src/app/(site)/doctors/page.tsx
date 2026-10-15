import type { Metadata } from "next";
import Link from "next/link";
import { List, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { getViewContext } from "@/server/context";
import { listDoctors, type DoctorFilters } from "@/server/doctors";
import { describeLocation, locationOptions, locationParam, resolveLocation } from "@/server/location";
import { getSpecialties, getCountries } from "@/server/queries/reference";
import { getDb } from "@/db";
import { clinics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DoctorCard } from "@/components/doctor/doctor-card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { SearchBar } from "@/components/common/search-bar";
import { LocationPicker } from "@/components/location/location-picker";
import { NoLicensedDoctors } from "@/components/location/no-licensed-doctors";
import { LazyMap } from "@/components/map/lazy-map";
import { SPOKEN_LANGUAGES } from "@/config/languages";
import { convertToInr } from "@/lib/pricing";
import { dayBoundsUtc, dayInZone } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Find a doctor", description: "Search verified doctors by specialty, language, fee and availability." };

type SP = Record<string, string | undefined>;

export default async function DoctorsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await getViewContext();
  const { t, fmt } = ctx;
  const loc = resolveLocation(sp.for, ctx.declared, ctx.user);
  const place = await describeLocation(loc);
  const [specs, options, allCountries, db] = await Promise.all([getSpecialties(), locationOptions(), getCountries(), getDb()]);
  const clinicList = await db.select({ slug: clinics.slug, name: clinics.name, city: clinics.city }).from(clinics).where(eq(clinics.verificationStatus, "approved"));

  const today = dayBoundsUtc(dayInZone(new Date(), ctx.tz), ctx.tz);
  const feeMax = sp.fee ? Number(sp.fee) : undefined;
  const filters: DoctorFilters = {
    q: sp.q,
    specialty: sp.specialty || undefined,
    language: sp.lang || undefined,
    gender: sp.gender === "female" || sp.gender === "male" ? sp.gender : undefined,
    maxFeeInrMinor: feeMax ? convertToInr(feeMax * 100, ctx.currency, ctx.rate) : undefined,
    minRating: sp.rating ? Number(sp.rating) : undefined,
    minExperience: sp.exp ? Number(sp.exp) : undefined,
    availableToday: sp.today === "1" ? today : undefined,
    mode: sp.mode === "online" || sp.mode === "in_clinic" || sp.mode === "both" ? sp.mode : undefined,
    licenceCountry: sp.licence || undefined,
    clinic: sp.clinic || undefined,
    sort: sp.sort === "rating" || sp.sort === "fee" || sp.sort === "experience" ? sp.sort : "soonest",
  };
  // In-clinic visits happen at clinics in India, so the India rules apply.
  const effectiveLoc = filters.mode === "in_clinic" ? { country: "IN", region: null } : loc;
  const effectivePlace = filters.mode === "in_clinic" ? await describeLocation(effectiveLoc) : place;
  const canList = effectivePlace.consultsEnabled && !effectivePlace.needsRegion;
  const results = canList ? await listDoctors(effectiveLoc, filters) : [];
  const view = sp.view === "map" ? "map" : "list";
  const active = Object.entries(sp).filter(([k, v]) => v && !["q", "for", "sort", "view"].includes(k)).length;
  const specName = specs.find((s) => s.slug === filters.specialty)?.name;
  const keep = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...extra })) if (v) q.set(k, v);
    return `/doctors?${q.toString()}`;
  };
  const licenceCountries = allCountries.filter((c) => c.localConsultsEnabled);
  const points = new Map<string, { lat: number; lng: number; title: string; subtitle: string; href: string }>();
  for (const d of results) {
    if (d.clinicLat && d.clinicLng && d.clinicSlug) {
      const p = points.get(d.clinicSlug);
      if (p) p.subtitle += `, ${d.fullName}`;
      else points.set(d.clinicSlug, { lat: d.clinicLat, lng: d.clinicLng, title: d.clinicName!, subtitle: d.fullName, href: `/hospitals/${d.clinicSlug}` });
    }
  }

  const filterForm = (
    <form action="/doctors" className="space-y-4">
      {sp.q ? <input type="hidden" name="q" value={sp.q} /> : null}
      <input type="hidden" name="for" value={locationParam(loc)} />
      {sp.view ? <input type="hidden" name="view" value={sp.view} /> : null}
      <FilterSelect id="f-specialty" name="specialty" label={t("Specialty")} value={sp.specialty} options={specs.map((s) => [s.slug, t(s.name)])} any={t("Any specialty")} />
      <FilterSelect id="f-mode" name="mode" label={t("Consult mode")} value={sp.mode} any={t("Online or in clinic")} options={[["online", t("Online (video, audio, chat)")], ["in_clinic", t("In clinic")], ["both", t("Both online and in clinic")]]} />
      <FilterSelect id="f-lang" name="lang" label={t("Language")} value={sp.lang} any={t("Any language")} options={Object.entries(SPOKEN_LANGUAGES).map(([k, v]) => [k, t(v)])} />
      <FilterSelect id="f-gender" name="gender" label={t("Doctor's gender")} value={sp.gender} any={t("Any")} options={[["female", t("Woman doctor")], ["male", t("Man doctor")]]} />
      <FilterSelect
        id="f-fee"
        name="fee"
        label={t("Fee up to")}
        value={sp.fee}
        any={t("Any fee")}
        options={(ctx.currency === "INR" ? [300, 500, 800, 1200] : ctx.currency === "BDT" ? [500, 1000, 1500, 2500] : ctx.currency === "AED" ? [25, 50, 100, 200] : [10, 20, 40, 80]).map((v) => [String(v), fmt.money(v * 100)])}
      />
      <FilterSelect id="f-rating" name="rating" label={t("Rating")} value={sp.rating} any={t("Any rating")} options={[["4.5", t("4.5 and above")], ["4", t("4 and above")]]} />
      <FilterSelect id="f-exp" name="exp" label={t("Experience")} value={sp.exp} any={t("Any experience")} options={[["5", t("5+ years")], ["10", t("10+ years")], ["20", t("20+ years")]]} />
      <FilterSelect id="f-licence" name="licence" label={t("Country of licence")} value={sp.licence} any={t("Any")} options={licenceCountries.map((c) => [c.code, c.name])} />
      <FilterSelect id="f-clinic" name="clinic" label={t("Hospital or clinic")} value={sp.clinic} any={t("Any")} options={clinicList.map((c) => [c.slug, `${c.name}, ${c.city}`])} />
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="today" value="1" defaultChecked={sp.today === "1"} className="size-6 accent-[var(--primary)]" />
        <span>{t("Available today")}</span>
      </label>
      <div className="flex gap-2">
        <button type="submit" className="tap flex-1 rounded-xl bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover">
          {t("Apply filters")}
        </button>
        {active ? (
          <Link href={`/doctors?for=${locationParam(loc)}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className="tap inline-flex items-center rounded-xl px-3 font-medium text-primary hover:bg-primary-soft">
            {t("Clear")}
          </Link>
        ) : null}
      </div>
    </form>
  );

  return (
    <div className="container-page py-8">
      <PageHeader
        title={specName ? t("{specialty} doctors", { specialty: t(specName) }) : t("Find a doctor")}
        description={t("Every doctor here is verified and licensed for the patient's location. Times are shown in your time zone ({zone}).", { zone: fmt.zone() })}
      />
      <div className="space-y-4">
        <SearchBar
          label={t("Search doctors")}
          placeholder={t("Symptom, specialty, doctor or hospital")}
          submitLabel={t("Search")}
          suggestions={specs.map((s) => t(s.name))}
          defaultValue={sp.q}
          hidden={{ for: locationParam(loc), ...(sp.mode ? { mode: sp.mode } : {}) }}
        />
        {filters.mode !== "in_clinic" ? (
          <details className="card p-4" open={!place.consultsEnabled || place.needsRegion || undefined}>
            <summary className="tap flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-fg-muted">{t("Showing doctors for a patient who is in:")}</span>
              <strong className="text-heading">{place.label}</strong>
              <span className="text-sm font-semibold text-primary underline">{t("Change")}</span>
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-sm text-fg-muted">{t("The patient's location decides which doctors may treat them. Booking for a parent in India from abroad? Choose India.")}</p>
              <LocationPicker options={options} current={loc} />
            </div>
          </details>
        ) : (
          <p className="text-fg-muted">{t("Clinic visits take place in India, so you see doctors licensed in India.")}</p>
        )}
      </div>

      {!canList ? (
        <div className="mt-6">
          <NoLicensedDoctors t={t} locationLabel={effectivePlace.label} needsRegion={effectivePlace.needsRegion} />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr]">
          <aside aria-label={t("Filters")}>
            <details className="card p-4 lg:hidden">
              <summary className="tap flex cursor-pointer list-none items-center gap-2 font-semibold">
                <SlidersHorizontal className="size-5" aria-hidden />
                {t("Filters")}
                {active ? <span className="rounded-full bg-primary px-2 text-sm text-on-primary">{active}</span> : null}
              </summary>
              <div className="mt-4">{filterForm}</div>
            </details>
            <div className="card hidden p-4 lg:block">
              <h2 className="mb-3 flex items-center gap-2 font-bold">
                <SlidersHorizontal className="size-5" aria-hidden />
                {t("Filters")}
              </h2>
              {filterForm}
            </div>
          </aside>
          <section aria-labelledby="results-heading" className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="results-heading" className="font-semibold" aria-live="polite">
                {ctx.tp("{count} doctor found", "{count} doctors found", results.length)}
              </h2>
              <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
                <form action="/doctors" className="flex min-w-0 max-w-full items-center gap-2">
                  {Object.entries(sp).map(([k, v]) => (k !== "sort" && v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
                  <label htmlFor="sort" className="text-sm text-fg-muted">
                    {t("Sort by")}
                  </label>
                  <Select id="sort" name="sort" defaultValue={filters.sort} className="w-auto min-w-0">
                    <option value="soonest">{t("Soonest available")}</option>
                    <option value="rating">{t("Rating")}</option>
                    <option value="fee">{t("Fee: low to high")}</option>
                    <option value="experience">{t("Experience")}</option>
                  </Select>
                  <button type="submit" className="tap rounded-xl border border-field px-3 text-sm font-semibold hover:bg-surface-2">
                    {t("Go")}
                  </button>
                </form>
                <div className="flex rounded-xl border border-field p-0.5" role="group" aria-label={t("View")}>
                  <Link href={keep({ view: undefined })} aria-current={view === "list" ? "page" : undefined} className={cn("tap grid place-items-center rounded-lg", view === "list" && "bg-primary-soft text-primary")} aria-label={t("List view")}>
                    <List className="size-5" aria-hidden />
                  </Link>
                  <Link href={keep({ view: "map" })} aria-current={view === "map" ? "page" : undefined} className={cn("tap grid place-items-center rounded-lg", view === "map" && "bg-primary-soft text-primary")} aria-label={t("Map view of clinics")}>
                    <MapIcon className="size-5" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
            {view === "map" ? (
              <div className="space-y-3">
                <LazyMap points={[...points.values()]} label={t("Map of clinics for these doctors")} height={420} />
                <p className="text-sm text-fg-muted">{t("Online-only doctors don't appear on the map.")}</p>
              </div>
            ) : null}
            {results.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {results.map((d) => (
                  <DoctorCard key={d.id} d={d} ctx={ctx} forLocation={filters.mode === "in_clinic" ? undefined : locationParam(loc)} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={t("No doctors match all your filters")}
                action={
                  <ButtonLink href={`/doctors?for=${locationParam(loc)}`} variant="secondary">
                    {t("Clear filters")}
                  </ButtonLink>
                }
              >
                {t("Try removing a filter such as 'Available today' or the fee limit, or use Consult now to be matched with the first available doctor.")}
              </EmptyState>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ id, name, label, value, options, any }: { id: string; name: string; label: string; value?: string; options: [string, string][]; any: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-heading">
        {label}
      </label>
      <Select id={id} name={name} defaultValue={value ?? ""}>
        <option value="">{any}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
    </div>
  );
}
