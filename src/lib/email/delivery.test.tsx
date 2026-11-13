import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => ({
  verify: vi.fn(),
  sendMail: vi.fn(),
  resendSend: vi.fn(),
}));
vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => transport) },
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: transport.resendSend };
  },
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
  transport.sendMail.mockImplementation(async (mail) => ({
    accepted: [mail.to],
    rejected: [],
    messageId: "test-message",
  }));
  transport.resendSend.mockResolvedValue({ data: { id: "test-resend-message" }, error: null });
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

  it("sends a private message to every notification recipient and a separate family confirmation", async () => {
    const { sendEnquiryEmails, getStakeholderEmails } = await import("./send");
    expect(await sendEnquiryEmails(inquiry)).toEqual({ ownerNotified: true, familyNotified: true });
    const messages = transport.sendMail.mock.calls.map(([mail]) => mail);
    expect(messages.map((mail) => mail.to).sort()).toEqual(
      [...getStakeholderEmails(), inquiry.email].sort(),
    );
    for (const mail of messages) {
      expect(typeof mail.to).toBe("string");
      expect(mail.to).not.toContain(",");
      expect(mail.cc).toBeUndefined();
      expect(mail.bcc).toBeUndefined();
      for (const other of getStakeholderEmails().filter((address) => address !== mail.to)) {
        expect(JSON.stringify(mail)).not.toContain(other);
      }
    }
    const confirmation = messages.find((mail) => mail.to === inquiry.email);
    expect(confirmation.replyTo).toBe("Columbia Care <mailbox@example.test>");
    expect(
      messages
        .filter((mail) => mail.to !== inquiry.email)
        .every((mail) => mail.replyTo === inquiry.email),
    ).toBe(true);
  });

  it("includes text and HTML without leaking addresses into the body", async () => {
    const { sendEnquiryEmails, getStakeholderEmails } = await import("./send");
    await sendEnquiryEmails(inquiry);
    for (const [mail] of transport.sendMail.mock.calls) {
      expect(mail.html).toContain("<html");
      expect(mail.text).toMatch(/test/i);
      expect(mail.text).not.toContain("<table");
      for (const address of getStakeholderEmails()) {
        expect(mail.html).not.toContain(address);
        expect(mail.text).not.toContain(address);
      }
      expect(mail.text).not.toMatch(/stakeholder|owner|distribution/i);
    }
  });

  it("continues sending other private notifications when one recipient fails", async () => {
    transport.sendMail.mockImplementation(async (mail) => {
      if (mail.to === "manager@example.test") throw { code: "EENVELOPE" };
      return { accepted: [mail.to], rejected: [], messageId: "test-message" };
    });
    const { sendEnquiryEmails, getStakeholderEmails } = await import("./send");
    expect(await sendEnquiryEmails(inquiry)).toEqual({
      ownerNotified: false,
      familyNotified: true,
    });
    expect(transport.sendMail).toHaveBeenCalledTimes(getStakeholderEmails().length + 1);
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

  it("sends status updates separately without CC or BCC", async () => {
    const { sendStakeholderStatusAlert, getStakeholderEmails } = await import("./send");
    expect(
      await sendStakeholderStatusAlert({
        inquiryName: "Test Family",
        previousStatus: "new",
        newStatus: "contacted",
        notes: null,
        updatedBy: "operator@example.test",
        adminUrl: "https://example.test/admin/inquiries",
      }),
    ).toBe(true);
    const messages = transport.sendMail.mock.calls.map(([mail]) => mail);
    expect(messages.map((mail) => mail.to).sort()).toEqual(getStakeholderEmails().sort());
    for (const mail of messages) {
      expect(mail.cc).toBeUndefined();
      expect(mail.bcc).toBeUndefined();
      for (const other of getStakeholderEmails().filter((address) => address !== mail.to)) {
        expect(JSON.stringify(mail)).not.toContain(other);
      }
    }
  });

  it("sends customer replies and their notification copies as individual messages", async () => {
    const { sendAdminReplyEmail, getStakeholderEmails } = await import("./send");
    expect(
      await sendAdminReplyEmail({
        customerEmail: "family@example.test",
        customerName: "Family",
        subject: "Your visit",
        message: "Thank you for your request.",
      }),
    ).toEqual({ success: true, copiesNotified: true });
    const messages = transport.sendMail.mock.calls.map(([mail]) => mail);
    expect(messages.map((mail) => mail.to).sort()).toEqual(
      ["family@example.test", ...getStakeholderEmails()].sort(),
    );
    for (const mail of messages) {
      expect(mail.replyTo).toBe("Columbia Care <mailbox@example.test>");
      expect(mail.cc).toBeUndefined();
      expect(mail.bcc).toBeUndefined();
      for (const other of getStakeholderEmails().filter((address) => address !== mail.to)) {
        expect(JSON.stringify(mail)).not.toContain(other);
      }
    }
  });

  it("keeps a successful customer reply successful if a private copy fails", async () => {
    transport.sendMail.mockImplementation(async (mail) => {
      if (mail.to === "manager@example.test") throw { code: "EENVELOPE" };
      return { accepted: [mail.to], rejected: [], messageId: "test-message" };
    });
    const { sendAdminReplyEmail } = await import("./send");
    expect(
      await sendAdminReplyEmail({
        customerEmail: "family@example.test",
        customerName: "Family",
        subject: "Your visit",
        message: "Thank you.",
      }),
    ).toEqual({ success: true, copiesNotified: false });
    expect(
      transport.sendMail.mock.calls.filter(([mail]) => mail.to === "family@example.test"),
    ).toHaveLength(1);
  });

  it("does not send a duplicate notification copy when the customer is already on the notification list", async () => {
    const { sendAdminReplyEmail } = await import("./send");
    await sendAdminReplyEmail({
      customerEmail: "owner@example.test",
      customerName: "Family",
      subject: "Your visit",
      message: "Thank you.",
    });
    expect(
      transport.sendMail.mock.calls.filter(([mail]) => mail.to === "owner@example.test"),
    ).toHaveLength(1);
  });

  it("preserves private recipients with the Resend provider too", async () => {
    vi.stubEnv("SMTP_PASS", "");
    vi.stubEnv("RESEND_API_KEY", "test-only-api-key");
    vi.stubEnv("RESEND_FROM", "Columbia Care <mailbox@example.test>");
    const { sendEnquiryEmails, getStakeholderEmails } = await import("./send");
    expect(await sendEnquiryEmails(inquiry)).toEqual({ ownerNotified: true, familyNotified: true });
    expect(transport.sendMail).not.toHaveBeenCalled();
    const messages = transport.resendSend.mock.calls.map(([mail]) => mail);
    expect(messages.map((mail) => mail.to).sort()).toEqual(
      [...getStakeholderEmails(), inquiry.email].sort(),
    );
    for (const mail of messages) {
      expect(typeof mail.to).toBe("string");
      expect(mail.cc).toBeUndefined();
      expect(mail.bcc).toBeUndefined();
      for (const other of getStakeholderEmails().filter((address) => address !== mail.to)) {
        expect(JSON.stringify(mail)).not.toContain(other);
      }
    }
  });

  it("rejects multiple addresses passed as a single string before contacting a provider", async () => {
    const { sendAdminReplyEmail } = await import("./send");
    const result = await sendAdminReplyEmail({
      customerEmail: "one@example.test,two@example.test",
      customerName: "Family",
      subject: "Your visit",
      message: "Thank you.",
    });
    expect(result.success).toBe(false);
    expect(transport.sendMail).not.toHaveBeenCalled();
    expect(transport.resendSend).not.toHaveBeenCalled();
  });
});
