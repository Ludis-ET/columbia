import { describe, expect, it } from "vitest";
import { readSmtpSettings, smtpErrorMessage } from "./smtp-config";

const environment = {
  SMTP_HOST: "mail.example.test",
  SMTP_USER: "notifications@example.test",
  SMTP_PASS: " password-with-spaces ",
};

describe("SMTP configuration", () => {
  it("uses verified implicit TLS on 465 and preserves the exact password", () => {
    const result = readSmtpSettings(environment);
    expect(result.missing).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.options).toMatchObject({
      host: "mail.example.test",
      port: 465,
      secure: true,
      requireTLS: false,
      auth: { user: "notifications@example.test", pass: " password-with-spaces " },
      tls: { rejectUnauthorized: true, servername: "mail.example.test" },
    });
    expect(result.from).toBe("Columbia Care <notifications@example.test>");
  });

  it("requires STARTTLS on 587", () => {
    expect(readSmtpSettings({ ...environment, SMTP_PORT: "587" }).options).toMatchObject({
      port: 587,
      secure: false,
      requireTLS: true,
    });
  });

  it.each([
    { SMTP_PORT: "invalid" },
    { SMTP_PORT: "70000" },
    { SMTP_PORT: "465", SMTP_SECURE: "false" },
    { SMTP_PORT: "587", SMTP_SECURE: "true" },
    { SMTP_SECURE: "yes" },
    { SMTP_HOST: "smtp://mail.example.test" },
  ])("rejects invalid transport settings: %j", (settings) => {
    const result = readSmtpSettings({ ...environment, ...settings });
    expect(result.options).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("names missing settings without inventing credentials", () => {
    const result = readSmtpSettings({});
    expect(result.options).toBeNull();
    expect(result.missing).toEqual(["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]);
  });

  it("returns safe guidance without echoing raw authentication responses", () => {
    const error = { code: "EAUTH", message: "Server echoed password-with-spaces" };
    expect(smtpErrorMessage(error)).toContain("full mailbox address");
    expect(smtpErrorMessage(error)).not.toContain("password-with-spaces");
  });
});
