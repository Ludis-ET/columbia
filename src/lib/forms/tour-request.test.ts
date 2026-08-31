import { describe, expect, it } from "vitest";
import { normalisePhone, tourRequestSchema } from "./tour-request";

/**
 * Schema unit tests.
 *
 * Format validation belongs here rather than in an end-to-end test: the schema
 * is a pure function, so this is faster, far more thorough, and — crucially —
 * writes nothing to the client's live enquiry inbox.
 */

const base = { name: "Jane Doe", email: "", phone: "", preferredTimes: [] };

describe("normalisePhone", () => {
  it("keeps only digits, whatever the punctuation", () => {
    for (const input of [
      "(425) 212-9108",
      "425.212.9108",
      "425 212 9108",
      "425-212-9108",
      "4252129108",
      " 425 212 9108 ",
    ]) {
      expect(normalisePhone(input), input).toBe("4252129108");
    }
  });

  it("drops a leading US country code", () => {
    expect(normalisePhone("+1 425-212-9108")).toBe("4252129108");
    expect(normalisePhone("1 (425) 212 9108")).toBe("4252129108");
  });
});

describe("tourRequestSchema", () => {
  it("accepts a phone number in any reasonable format", () => {
    for (const phone of [
      "(425) 212-9108",
      "425.212.9108",
      "425 212 9108",
      "+1 425-212-9108",
      "4252129108",
    ]) {
      const result = tourRequestSchema.safeParse({ ...base, phone });
      expect(result.success, `"${phone}" should be accepted`).toBe(true);
    }
  });

  it("rejects a number that is not ten digits", () => {
    const result = tourRequestSchema.safeParse({ ...base, phone: "425-212" });
    expect(result.success).toBe(false);
  });

  it("requires a name", () => {
    const result = tourRequestSchema.safeParse({ ...base, name: "  ", phone: "4252129108" });
    expect(result.success).toBe(false);
  });

  it("requires at least one way to reply", () => {
    const result = tourRequestSchema.safeParse(base);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => /phone number or an email/.test(i.message))).toBe(
        true,
      );
    }
  });

  it("accepts a phone alone, or an email alone", () => {
    expect(tourRequestSchema.safeParse({ ...base, phone: "4252129108" }).success).toBe(true);
    expect(tourRequestSchema.safeParse({ ...base, email: "a@example.com" }).success).toBe(true);
  });

  it("catches a malformed email", () => {
    const result = tourRequestSchema.safeParse({ ...base, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("treats any honeypot content as invalid", () => {
    const result = tourRequestSchema.safeParse({
      ...base,
      phone: "4252129108",
      company: "SpamCo",
    });
    expect(result.success).toBe(false);
  });
});
