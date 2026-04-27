/** Use in selects when the customer’s town is not listed. */
export const GHANA_CITY_OTHER = "Other";

/**
 * Major cities / towns per region (ends with "Other" → show free-text city field).
 * Slugs must match `GHANA_REGIONS[].slug`.
 */
export const GHANA_CITIES_BY_REGION: Record<string, string[]> = {
  "greater-accra": [
    "Accra",
    "Tema",
    "Madina",
    "East Legon",
    "Osu",
    "Ridge",
    "Adabraka",
    "Dansoman",
    "Achimota",
    "Nungua",
    "Ashaiman",
    "Kasoa",
    "Spintex",
    "Haatso",
    "Other",
  ],
  ashanti: [
    "Kumasi",
    "Obuasi",
    "Mampong",
    "Konongo",
    "Ejisu",
    "Bekwai",
    "Nkawie",
    "Tafo",
    "Other",
  ],
  western: ["Takoradi", "Tarkwa", "Axim", "Elubo", "Prestea", "Other"],
  central: ["Cape Coast", "Kasoa", "Winneba", "Mankessim", "Saltpond", "Elmina", "Other"],
  eastern: ["Koforidua", "Nkawkaw", "Akim Oda", "Somanya", "Aburi", "Other"],
  volta: ["Ho", "Hohoe", "Keta", "Aflao", "Sogakope", "Kpando", "Other"],
  northern: ["Tamale", "Yendi", "Savelugu", "Bimbilla", "Other"],
  "upper-east": ["Bolgatanga", "Navrongo", "Bawku", "Other"],
  "upper-west": ["Wa", "Lawra", "Tumu", "Other"],
  bono: ["Sunyani", "Berekum", "Dormaa Ahenkro", "Wenchi", "Other"],
  "bono-east": ["Techiman", "Kintampo", "Atebubu", "Other"],
  ahafo: ["Goaso", "Duayaw Nkwanta", "Other"],
  "western-north": ["Sefwi Wiawso", "Bibiani", "Enchi", "Other"],
  oti: ["Dambai", "Kadjebi", "Nkwanta", "Other"],
  "north-east": ["Nalerigu", "Gambaga", "Other"],
  savannah: ["Damongo", "Salaga", "Other"],
};

export function citiesForRegion(regionSlug: string): string[] {
  return GHANA_CITIES_BY_REGION[regionSlug] ?? ["Other"];
}

export function splitCityForRegion(regionSlug: string, savedCity: string | null | undefined): {
  pick: string;
  other: string;
} {
  const c = (savedCity ?? "").trim();
  if (!c) return { pick: citiesForRegion(regionSlug)[0] ?? GHANA_CITY_OTHER, other: "" };
  const list = citiesForRegion(regionSlug);
  if (list.includes(c)) return { pick: c, other: "" };
  return { pick: GHANA_CITY_OTHER, other: c };
}

export const GHANA_REGIONS: { slug: string; label: string; feeGhs: number }[] = [
  { slug: "greater-accra", label: "Greater Accra", feeGhs: 15 },
  { slug: "ashanti", label: "Ashanti", feeGhs: 25 },
  { slug: "western", label: "Western", feeGhs: 28 },
  { slug: "central", label: "Central", feeGhs: 28 },
  { slug: "eastern", label: "Eastern", feeGhs: 28 },
  { slug: "volta", label: "Volta", feeGhs: 30 },
  { slug: "northern", label: "Northern", feeGhs: 40 },
  { slug: "upper-east", label: "Upper East", feeGhs: 45 },
  { slug: "upper-west", label: "Upper West", feeGhs: 45 },
  { slug: "bono", label: "Bono", feeGhs: 32 },
  { slug: "bono-east", label: "Bono East", feeGhs: 32 },
  { slug: "ahafo", label: "Ahafo", feeGhs: 32 },
  { slug: "western-north", label: "Western North", feeGhs: 35 },
  { slug: "oti", label: "Oti", feeGhs: 35 },
  { slug: "north-east", label: "North East", feeGhs: 42 },
  { slug: "savannah", label: "Savannah", feeGhs: 42 },
];

/** Couriers shown when customer chooses home delivery (pickup uses backend default). */
export const DELIVERY_COURIER_OPTIONS = [
  "Station driver",
  "Speedaf",
  "FedEx",
  "Ghana Post",
  "Other courier",
] as const;

export const COURIER_OPTIONS = [
  "Local pickup (store)",
  ...DELIVERY_COURIER_OPTIONS,
] as const;

export type ShippingMethodClient = "pickup" | "delivery";

export function deliveryFeeFor(method: ShippingMethodClient, regionSlug: string | null): number {
  if (method === "pickup") return 0;
  if (!regionSlug) return 0;
  const row = GHANA_REGIONS.find((r) => r.slug === regionSlug);
  return row?.feeGhs ?? 35;
}
