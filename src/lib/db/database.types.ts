/**
 * Database row shapes.
 *
 * Hand-written to mirror supabase/migrations/0001_schema.sql. Regenerate from
 * the live database once the migration is applied and you have a project access
 * token:
 *
 *   pnpm db:types
 *
 * Keep this file and the migration in step, a mismatch here is a runtime bug
 * the type checker will happily wave through.
 */

export type AdminRole = "owner" | "editor";
export type AvailabilityStatus = "unset" | "accepting" | "limited" | "waitlist" | "full";
export type InquiryKind = "tour" | "contact" | "packet";
export type InquiryStatus = "new" | "contacted" | "toured" | "moved_in" | "closed";
export type AccentToken = "navy" | "sage" | "blue" | "violet" | "amber" | "rose";

export interface SiteSettingsRow {
  id: string;
  phone: string | null;
  phone_display: string | null;
  sms: string | null;
  fax: string | null;
  email: string | null;
  street_address: string | null;
  address_locality: string | null;
  address_region: string | null;
  postal_code: string | null;
  address_country: string | null;
  latitude: number | null;
  longitude: number | null;
  license_number: string | null;
  licensed_capacity: number | null;
  hours: string | null;
  location_line: string | null;
  service_area: string[];
  socials: Record<string, string>;
  updated_at: string;
}

export interface AvailabilityRow {
  id: string;
  status: AvailabilityStatus;
  note: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface ServiceRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string | null;
  icon: string;
  position: number;
  featured: boolean;
  has_detail_page: boolean;
  related_schedule: number[];
  published: boolean;
}

export interface CareTypeRow {
  id: string;
  slug: string;
  title: string;
  short_title: string;
  icon: string;
  position: number;
  published: boolean;
}

export interface ScheduleItemRow {
  id: string;
  position: number;
  time_label: string;
  sort_minutes: number;
  title: string;
  body: string;
  bullets: string[];
  icon: string;
  accent: AccentToken;
  published: boolean;
}

export interface EveryDayRow {
  id: string;
  title: string;
  icon: string;
  position: number;
  published: boolean;
}

export interface WhyFamiliesRow {
  id: string;
  text: string;
  position: number;
  published: boolean;
}

export interface MediaRow {
  id: string;
  storage_path: string;
  alt: string;
  caption: string | null;
  category: string | null;
  width: number | null;
  height: number | null;
  blur_data_url: string | null;
  contains_people: boolean;
  release_on_file: boolean;
  position: number;
  featured: boolean;
  published: boolean;
}

export interface TestimonialRow {
  id: string;
  quote: string;
  author: string;
  relationship: string | null;
  consent_on_file: boolean;
  position: number;
  published: boolean;
}

export interface FaqRow {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  position: number;
  published: boolean;
}

export interface TeamRow {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  photo_id: string | null;
  languages: string[];
  position: number;
  published: boolean;
}

export interface InquiryRow {
  id: string;
  kind: InquiryKind;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  preferred_times: string[];
  relationship: string | null;
  care_needs: Record<string, unknown> | null;
  status: InquiryStatus;
  owner_notes: string | null;
  source: string | null;
  utm: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}
