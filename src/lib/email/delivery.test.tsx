import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => ({
  verify: vi.fn(),
  sendMail: vi.fn(),
}));
vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => transport) },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  for (const [name, value] of Object.entries({
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: "465",
    SMTP_SECURE: "true",
    SMTP_USER: "mailbox@example.test",
    SMTP_PASS: "test-only-secret",
    SMTP_FROM: "Columbia Care <mailbox@example.test>",
    RESEND_API_KEY: "",
    OWNER_NOTIFICATION_EMAIL: "owner@example.test",
    STAKEHOLDER_EMAILS: "manager@example.test",
  }))
    vi.stubEnv(name, value);
  transport.verify.mockResolvedValue(true);
  transport.sendMail.mockResolvedValue({
    accepted: ["owner@example.test"],
    rejected: [],
    messageId: "test-message",
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const inquiry = {
  name: "Test Family",
  email: "family@example.test",
  phone: null,
  relationship: null,
  message: null,
  preferredTimes: [],
  adminUrl: "https://example.test/admin/inquiries",
  addressLine: null,
  locationLine: null,
};

describe("SMTP diagnostics and delivery", () => {
  it("checks authentication without sending mail", async () => {
    const { verifyEmailConnection } = await import("./send");
    expect((await verifyEmailConnection()).ok).toBe(true);
    expect(transport.verify).toHaveBeenCalledOnce();
    expect(transport.sendMail).not.toHaveBeenCalled();
  });

  it("reports missing runtime settings before connecting", async () => {
    vi.stubEnv("SMTP_PASS", "");
    const { verifyEmailConnection } = await import("./send");
    const result = await verifyEmailConnection();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("SMTP_PASS");
    expect(transport.verify).not.toHaveBeenCalled();
  });

  it("never includes the password in owner-visible status or errors", async () => {
    transport.verify.mockRejectedValue({ code: "EAUTH", message: "test-only-secret" });
    const { verifyEmailConnection, getEmailConfiguration } = await import("./send");
    const result = await verifyEmailConnection();
    expect(result.ok).toBe(false);
    expect(result.message).toContain("SMTP login failed");
    expect(JSON.stringify({ result, configuration: getEmailConfiguration() })).not.toContain(
      "test-only-secret",
    );
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("test-only-secret");
  });

  it("delivers to both owner and stakeholders, then confirms to the family", async () => {
    const { sendEnquiryEmails } = await import("./send");
    expect(await sendEnquiryEmails(inquiry)).toEqual({ ownerNotified: true, familyNotified: true });
    const first = transport.sendMail.mock.calls[0][0];
    expect(first.to).toEqual(
      expect.arrayContaining([
        "owner@example.test",
        "manager@example.test",
        "Wondimubelete4@gmail.com",
        "Zgenet19@gmail.com",
        "leulsegedmelaku1020@gmail.com",
      ]),
    );
    expect(transport.sendMail.mock.calls[1][0]).toMatchObject({
      to: "family@example.test",
      replyTo: "owner@example.test",
    });
    expect(transport.sendMail).toHaveBeenCalledTimes(2);
  });

  it("includes readable text and HTML without leaking notification addresses into the body", async () => {
    const { sendEnquiryEmails } = await import("./send");
    await sendEnquiryEmails(inquiry);
    const mail = transport.sendMail.mock.calls[0][0];
    expect(mail.html).toContain("<html");
    expect(mail.text).toContain("Test Family");
    expect(mail.text).not.toContain("<table");
    for (const address of mail.to) {
      expect(mail.html).not.toContain(address);
      expect(mail.text).not.toContain(address);
    }
    expect(mail.text).not.toMatch(/stakeholder|owner|distribution/i);
  });

  it("does not claim all owners were notified when one recipient was rejected", async () => {
    transport.sendMail.mockResolvedValueOnce({
      accepted: ["owner@example.test"],
      rejected: ["manager@example.test"],
      messageId: "partial",
    });
    const { sendEnquiryEmails } = await import("./send");
    expect(await sendEnquiryEmails(inquiry)).toEqual({
      ownerNotified: false,
      familyNotified: true,
    });
    expect(transport.sendMail).toHaveBeenCalledTimes(2);
  });

  it("reports mailbox authentication failure instead of success", async () => {
    transport.sendMail.mockRejectedValue({ code: "EAUTH" });
    const { sendAdminReplyEmail } = await import("./send");
    const result = await sendAdminReplyEmail({
      customerEmail: "family@example.test",
      customerName: "Family",
      subject: "Reply",
      message: "Hello",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("SMTP login failed");
  });
});
