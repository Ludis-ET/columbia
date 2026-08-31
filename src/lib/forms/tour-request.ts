import { z } from "zod";

/**
 * The tour request schema.
 *
 * ONE schema, used by the client form and again inside the server action.
 * Client-side validation is a courtesy; the server-side parse is the one that
 * matters, and they cannot drift because they are literally the same object.
 *
 * Deliberately forgiving. The people filling this in are often anxious, often
 * on a phone, often at night. Every rule here has to earn its place — a form
 * that rejects a valid phone number because of a bracket has cost the home a
 * resident.
 */

/** Strips everything but digits. `(425) 212-9108` and `425.212.9108` both work. */
export function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  // Tolerate a leading US country code.
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

const phone = z
  .string()
  .trim()
  .refine((v) => v === "" || normalisePhone(v).length === 10, {
    message: "That doesn't look like a 10-digit phone number. Any format is fine.",
  });

export const PREFERRED_TIMES = [
  "Weekday morning",
  "Weekday afternoon",
  "Weekday evening",
  "Weekend",
  "As soon as possible",
] as const;

export const RELATIONSHIPS = [
  "I'm looking for a parent",
  "I'm looking for my spouse",
  "I'm looking for myself",
  "I'm looking for another relative",
  "I'm a case manager or social worker",
  "Something else",
] as const;

export const tourRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Please tell us your name.")
      .max(120, "That name is longer than we can store."),

    email: z
      .string()
      .trim()
      .max(200)
      .refine((v) => v === "" || z.email().safeParse(v).success, {
        message: "Please check that email address.",
      }),

    phone,

    relationship: z.enum(RELATIONSHIPS).optional().or(z.literal("")),

    message: z.string().trim().max(4000, "Please keep this under 4000 characters.").optional(),

    preferredTimes: z.array(z.enum(PREFERRED_TIMES)).max(PREFERRED_TIMES.length).default([]),

    /**
     * Honeypot. Real people never see this field, so anything in it is a bot.
     * Named `company` because that is what naive form-fillers target.
     */
    company: z.string().max(0, "").optional(),

    /** Cloudflare Turnstile token. Absent when Turnstile is not configured. */
    turnstileToken: z.string().optional(),
  })
  // A lead we cannot reply to is not a lead — this mirrors the CHECK constraint
  // on the inquiries table, so the database and the form agree.
  .refine((data) => data.email !== "" || data.phone !== "", {
    message: "Please leave either a phone number or an email address so we can reply.",
    path: ["phone"],
  });

export type TourRequest = z.infer<typeof tourRequestSchema>;

export const emptyTourRequest: TourRequest = {
  name: "",
  email: "",
  phone: "",
  relationship: "",
  message: "",
  preferredTimes: [],
  company: "",
  turnstileToken: "",
};
