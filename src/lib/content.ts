import raw from "@content/source-of-truth.json";

/**
 * Typed access to content/source-of-truth.json.
 *
 * THE POINT OF THIS MODULE: `published()` is the only way content reaches a
 * component, and it returns `null` for anything the client has not confirmed.
 * That makes the rule in CLAUDE.md a property of the code rather than a promise
 * in a document, a component physically cannot render an unconfirmed fact.
 *
 * When the client confirms a value: set it in the JSON, change provenance to
 * ARTWORK_CONFIRMED, add `confirmedOn`. Nothing else needs to change.
 */

export type Provenance = "ARTWORK" | "ARTWORK_CONFIRMED" | "ASK_CLIENT" | "RECOMMEND";

/** Provenance values that may appear on the public site. */
const PUBLISHABLE: readonly Provenance[] = ["ARTWORK", "ARTWORK_CONFIRMED"];

export interface Entry<T> {
  value: T | null;
  provenance: Provenance;
  source?: string;
  note?: string;
  question?: string;
  blocks?: string;
  confirmedOn?: string;
}

/**
 * Unwrap a content entry for rendering. Returns null unless the value exists
 * AND its provenance permits publication.
 *
 * Callers must handle null by rendering nothing, no placeholder, no
 * "Coming soon", no stub heading.
 */
export function published<T>(entry: Entry<T>): T | null {
  if (!PUBLISHABLE.includes(entry.provenance)) return null;
  return entry.value ?? null;
}

/** True when an entry is still waiting on the client. Build tooling only. */
export function isPending<T>(entry: Entry<T>): boolean {
  return published(entry) === null;
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface ScheduleItem {
  position: number;
  timeLabel: string;
  sortMinutes: number;
  title: string;
  icon: string;
  accent: "navy" | "sage" | "blue" | "violet" | "amber" | "rose";
  body: string;
  bullets?: string[];
}

export interface Service {
  slug: string;
  title: string;
  icon: string;
  hasDetailPage: boolean;
  /**
   * Positions of day-timeline entries that demonstrate this service. An
   * editorial cross-reference to sentences the client already wrote, it lets a
   * detail page be built entirely from the artwork, with no invented copy.
   */
  relatedSchedule: number[];
  /** Null until the client writes one. Renders nothing while null. */
  description: string | null;
  sourceNote?: string;
}

export interface CareType {
  slug: string;
  title: string;
  shortTitle: string;
  icon: string;
}

export interface EveryDayItem {
  title: string;
  icon: string;
}

export interface Address {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
}

export interface OpenQuestion {
  id: number;
  priority: "blocker" | "high" | "medium";
  question: string;
  blocks: string;
}

interface SourceOfTruth {
  identity: {
    name: Entry<string>;
    shortName: Entry<string>;
    tagline: Entry<string>;
    promise: Entry<string>;
    closingLine: Entry<string>;
    tourCta: Entry<string>;
    values: Entry<string[]>;
    about: Entry<string>;
    meals: Entry<string>;
  };
  contact: {
    phonePrimary: Entry<string>;
    sms: Entry<string>;
    fax: Entry<string>;
    email: Entry<string>;
    address: Entry<Address>;
    geo: Entry<{ lat: number; lng: number }>;
    serviceArea: Entry<string[]>;
    locationLine: Entry<string>;
    hours: Entry<string>;
    licenseNumber: Entry<string>;
    licensedCapacity: Entry<number>;
  };
  careTypes: Entry<CareType[]>;
  services: Entry<Service[]>;
  whyFamilies: Entry<string[]>;
  everyDay: Entry<EveryDayItem[]>;
  schedule: Entry<ScheduleItem[]>;
  testimonials: Entry<unknown[]>;
  team: Entry<unknown[]>;
  faqs: Entry<FaqEntry[]>;
  admissions: {
    paymentTypes: Entry<string[]>;
    rate: Entry<string>;
    admissionCriteria: Entry<string>;
    dshsDisclosure: Entry<string>;
  };
  openQuestions: OpenQuestion[];
}

export interface FaqEntry {
  question: string;
  answer: string;
}

const content = raw as unknown as SourceOfTruth;

export const identity = content.identity;
export const contact = content.contact;
export const careTypes = content.careTypes;
export const services = content.services;
export const whyFamilies = content.whyFamilies;
export const everyDay = content.everyDay;
export const schedule = content.schedule;
export const testimonials = content.testimonials;
export const team = content.team;
export const faqs = content.faqs;
export const admissions = content.admissions;
export const openQuestions = content.openQuestions;

// ---------------------------------------------------------------------------
// Convenience
// ---------------------------------------------------------------------------

/** Business name. Present in the artwork, so this is always a string. */
export const siteName = published(identity.name) ?? "Columbia Care Adult Family Home";

/** Formats the address as a single line, or null if unconfirmed. */
export function addressLine(): string | null {
  const a = published(contact.address);
  if (!a) return null;
  return `${a.streetAddress}, ${a.addressLocality}, ${a.addressRegion} ${a.postalCode}`;
}

/** Strips a phone number to digits for a tel: href, or null if unconfirmed. */
export function telHref(): string | null {
  const phone = published(contact.phonePrimary);
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `tel:+1${digits}` : `tel:${digits}`;
}

/** Everything still blocked on the client, worst first. Used by /specimen. */
export function pendingQuestions(): OpenQuestion[] {
  const order = { blocker: 0, high: 1, medium: 2 } as const;
  return [...openQuestions].sort((a, b) => order[a.priority] - order[b.priority]);
}

/** Published services, or an empty list. */
export function serviceList(): Service[] {
  return published(services) ?? [];
}

/** Services that have their own page. Drives generateStaticParams. */
export function servicesWithPages(): Service[] {
  return serviceList().filter((service) => service.hasDetailPage);
}

export function findService(slug: string): Service | null {
  return serviceList().find((service) => service.slug === slug) ?? null;
}

/** Published schedule entries in day order. */
export function scheduleList(): ScheduleItem[] {
  return [...(published(schedule) ?? [])].sort((a, b) => a.position - b.position);
}

/**
 * The schedule entries a service points at. Used to build service pages out of
 * the client's own words rather than invented description copy.
 */
export function scheduleFor(positions: number[]): ScheduleItem[] {
  if (positions.length === 0) return [];
  const wanted = new Set(positions);
  return scheduleList().filter((item) => wanted.has(item.position));
}

/** The four mealtimes, for the Meals page. Positions are from the artwork. */
export function mealtimes(): ScheduleItem[] {
  return scheduleFor([2, 5, 8, 9]);
}
