import { cache } from "react";
import { getSupabase } from "./client";
import type {
  AvailabilityRow,
  AvailabilityStatus,
  CareTypeRow,
  EveryDayRow,
  FaqRow,
  MediaRow,
  ScheduleItemRow,
  ServiceRow,
  SiteSettingsRow,
  TestimonialRow,
  WhyFamiliesRow,
} from "./database.types";

import * as file from "@/lib/content";
import { galleryImages as placeholderGallery, heroImage, mealsImage } from "@/lib/images";
import { isGalleryItem, mediaPublicUrl, type SectionSlot } from "@/lib/media";
import type { CareType, EveryDayItem, ScheduleItem, Service } from "@/lib/content";
import type { GalleryImage } from "@/components/site/gallery";
import type { TestimonialItem } from "@/components/site/testimonial";
import type { FaqItem } from "@/components/site/faq-accordion";

/**
 * Content reads.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS A FALLBACK
 *
 * The public site is statically generated. If Supabase is unreachable at build
 * time, most likely because a free-tier project auto-paused after a week of
 * inactivity, a naive build would emit an empty website for a care home.
 *
 * So every read falls back to content/source-of-truth.json, which is the same
 * content the database was seeded from. The marketing site therefore cannot go
 * down because of the database. Only the admin console and the contact form
 * depend on Supabase being awake.
 *
 * ---------------------------------------------------------------------------
 * WHEN EMPTY MEANS EMPTY
 *
 * Two different situations look alike and must not be confused:
 *
 *   Seeded-from-artwork tables (services, care types, schedule, every-day,
 *   why-families, settings) should never be empty. Zero rows means the seed did
 *   not run or the query failed, so we fall back to the file.
 *
 *   Deliberately-empty tables (testimonials, faqs, team, media) are empty
 *   because the client has not supplied that content yet. Zero rows is the
 *   CORRECT answer, and falling back would be wrong. These return [] and their
 *   sections render nothing.
 * ---------------------------------------------------------------------------
 */

/**
 * Reads a whole table, or returns null when the query failed outright.
 *
 * These tables hold tens of rows, not thousands, so filtering and sorting in JS
 * keeps the call sites readable and costs nothing. Note the difference between
 * `null` (query failed, fall back) and `[]` (genuinely empty).
 */
async function select<T>(table: string): Promise<T[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.warn(`[db] ${table} query failed, falling back to file content:`, error.message);
      return null;
    }
    return (data ?? []) as T[];
  } catch (error) {
    console.warn(`[db] ${table} unreachable, falling back to file content:`, error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Seeded-from-artwork content, falls back to the file when empty or failed
// ---------------------------------------------------------------------------

export const getServices = cache(async (): Promise<Service[]> => {
  const rows = await select<ServiceRow>("services");

  if (!rows || rows.length === 0) return file.serviceList();

  return rows
    .filter((r) => r.published)
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      icon: r.icon,
      hasDetailPage: r.has_detail_page,
      relatedSchedule: r.related_schedule ?? [],
      description: r.summary,
    }));
});

export const getCareTypes = cache(async (): Promise<CareType[]> => {
  const rows = await select<CareTypeRow>("care_types");

  if (!rows || rows.length === 0) return file.published(file.careTypes) ?? [];

  return rows
    .filter((r) => r.published)
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      shortTitle: r.short_title,
      icon: r.icon,
    }));
});

export const getSchedule = cache(async (): Promise<ScheduleItem[]> => {
  const rows = await select<ScheduleItemRow>("schedule_items");

  if (!rows || rows.length === 0) return file.scheduleList();

  return rows
    .filter((r) => r.published)
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      position: r.position,
      timeLabel: r.time_label,
      sortMinutes: r.sort_minutes,
      title: r.title,
      body: r.body,
      bullets: r.bullets?.length ? r.bullets : undefined,
      icon: r.icon,
      accent: r.accent,
    }));
});

export const getEveryDay = cache(async (): Promise<EveryDayItem[]> => {
  const rows = await select<EveryDayRow>("every_day");

  if (!rows || rows.length === 0) return file.published(file.everyDay) ?? [];

  return rows
    .filter((r) => r.published)
    .sort((a, b) => a.position - b.position)
    .map((r) => ({ title: r.title, icon: r.icon }));
});

export const getWhyFamilies = cache(async (): Promise<string[]> => {
  const rows = await select<WhyFamiliesRow>("why_families");

  if (!rows || rows.length === 0) return file.published(file.whyFamilies) ?? [];

  return rows
    .filter((r) => r.published)
    .sort((a, b) => a.position - b.position)
    .map((r) => r.text);
});

export interface SiteSettings {
  phone: string | null;
  telHref: string | null;
  sms: string | null;
  fax: string | null;
  email: string | null;
  addressLine: string | null;
  locationLine: string | null;
  hours: string | null;
  licenseNumber: string | null;
  licensedCapacity: number | null;
  serviceArea: string[];
}

function toTelHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `tel:+1${digits}` : `tel:${digits}`;
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const rows = await select<SiteSettingsRow>("site_settings");
  const row = rows?.[0];

  if (!row) {
    // File fallback, identical content, same provenance gate.
    return {
      phone: file.published(file.contact.phonePrimary),
      telHref: file.telHref(),
      sms: file.published(file.contact.sms),
      fax: file.published(file.contact.fax),
      email: file.published(file.contact.email),
      addressLine: file.addressLine(),
      locationLine: file.published(file.contact.locationLine),
      hours: file.published(file.contact.hours),
      licenseNumber: file.published(file.contact.licenseNumber),
      licensedCapacity: file.published(file.contact.licensedCapacity),
      serviceArea: file.published(file.contact.serviceArea) ?? [],
    };
  }

  const addressLine =
    row.street_address && row.address_locality
      ? `${row.street_address}, ${row.address_locality}, ${row.address_region} ${row.postal_code}`
      : null;

  return {
    phone: row.phone_display ?? row.phone,
    telHref: toTelHref(row.phone),
    sms: row.sms,
    fax: row.fax,
    email: row.email,
    addressLine,
    locationLine: row.location_line,
    hours: row.hours,
    licenseNumber: row.license_number,
    licensedCapacity: row.licensed_capacity,
    serviceArea: row.service_area ?? [],
  };
});

// ---------------------------------------------------------------------------
// Availability, "unset" is a real state and renders nothing
// ---------------------------------------------------------------------------

export interface Availability {
  status: Exclude<AvailabilityStatus, "unset"> | null;
  note: string | null;
  updatedAt: string | null;
}

export const getAvailability = cache(async (): Promise<Availability> => {
  const rows = await select<AvailabilityRow>("availability");
  const row = rows?.[0];

  if (!row || row.status === "unset") return { status: null, note: null, updatedAt: null };

  return { status: row.status, note: row.note, updatedAt: row.updated_at };
});

// ---------------------------------------------------------------------------
// Deliberately-empty content, [] is the correct answer, never a fallback
// ---------------------------------------------------------------------------

export const getTestimonials = cache(async (): Promise<TestimonialItem[]> => {
  const rows = await select<TestimonialRow>("testimonials");
  if (!rows) return [];

  return rows
    .filter((r) => r.published && r.consent_on_file)
    .sort((a, b) => a.position - b.position)
    .map((r) => ({ quote: r.quote, author: r.author, relationship: r.relationship }));
});

export const getFaqs = cache(async (): Promise<FaqItem[]> => {
  const rows = await select<FaqRow>("faqs");
  if (!rows) return [];

  return rows
    .filter((r) => r.published)
    .sort((a, b) => a.position - b.position)
    .map((r) => ({ question: r.question, answer: r.answer }));
});

/**
 * Gallery.
 *
 * Falls back to the placeholder set while the media table is empty, because
 * Phase 8 has not happened yet and a gallery page with no photographs would be
 * worse than one with obvious scaffolding. `pnpm check:placeholders` tracks
 * this, and it becomes a hard build failure under LAUNCH_READY=1.
 */
export const getGallery = cache(async (): Promise<GalleryImage[]> => {
  const rows = await select<MediaRow>("media");

  if (!rows || rows.length === 0) return placeholderGallery;

  const galleryRows = rows.filter(
    (r) =>
      isGalleryItem(r.category) &&
      r.published &&
      (!r.contains_people || r.release_on_file),
  );

  if (galleryRows.length === 0) return placeholderGallery;

  return galleryRows
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      src: mediaPublicUrl(r.storage_path) ?? "",
      alt: r.alt,
      caption: r.caption,
      category: r.category,
      width: r.width ?? undefined,
      height: r.height ?? undefined,
    }))
    .filter((r) => r.src);
});

/**
 * A single section photograph (hero or meals band).
 *
 * Falls back to the placeholder in `src/lib/images.ts` when nothing is published.
 */
export const getSectionImage = cache(
  async (slot: SectionSlot): Promise<{ src: string; alt: string }> => {
    const fallback = slot === "hero" ? heroImage : mealsImage;
    const rows = await select<MediaRow>("media");
    if (!rows) return fallback;

    const match = rows.find(
      (r) =>
        r.category === slot &&
        r.published &&
        (!r.contains_people || r.release_on_file),
    );

    if (!match) return fallback;

    const src = mediaPublicUrl(match.storage_path);
    if (!src) return fallback;

    return { src, alt: match.alt };
  },
);

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export async function getServicesWithPages(): Promise<Service[]> {
  return (await getServices()).filter((s) => s.hasDetailPage);
}

export async function findServiceBySlug(slug: string): Promise<Service | null> {
  return (await getServices()).find((s) => s.slug === slug) ?? null;
}

/** Schedule entries a service points at, in day order. */
export async function getScheduleFor(positions: number[]): Promise<ScheduleItem[]> {
  if (positions.length === 0) return [];
  const wanted = new Set(positions);
  return (await getSchedule()).filter((item) => wanted.has(item.position));
}

/** Breakfast, lunch, dinner prep, dinner. */
export async function getMealtimes(): Promise<ScheduleItem[]> {
  return getScheduleFor([2, 5, 8, 9]);
}
