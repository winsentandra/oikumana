export type Locale = "en" | "id";

export type Localized = Record<Locale, string>;

/** Maps directly onto bus.svg / mrt.svg / train.svg. */
export type TransitKind = "bus" | "mrt" | "train";

export interface Transit {
  kind: TransitKind;
  name: string;
  /** Route or corridor, e.g. "Koridor 1". Omitted when there isn't one. */
  line?: string;
  distanceM: number;
}

export interface Church {
  slug: string;
  name: Localized;
  /** Shown in the maroon eyebrow on desktop, e.g. "Cathedral". */
  category: Localized;
  /** Shown in the maroon eyebrow on mobile, and in every list row. */
  parish: string;
  deanery: Localized;
  /** Drives the region chip filter. */
  region: string;
  /** Slugs of every church (including this one) sharing this location as a
   * single pin, in tab display order. Omitted for churches with their own
   * pin. */
  group?: string[];
  /** ISO date; formatted per locale at render time. */
  consecratedOn?: string;
  /** Paragraphs. Everything after the first takes a first-line indent. */
  history: Localized;
  transits: Transit[];
  address: string;
  coords: [lat: number, lng: number];
  directionsUrl?: string;
}
