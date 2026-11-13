import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { render, toPlainText } from "@react-email/components";
import { getStakeholderEmails } from "./send";
import {
  AdminCustomerReplyEmail,
  FamilyAutoReply,
  StakeholderEnquiryEmail,
  StakeholderStatusUpdateEmail,
} from "./templates";

describe("Stakeholder email routing", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.STAKEHOLDER_EMAILS;
    delete process.env.OWNER_NOTIFICATION_EMAIL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("includes all three primary stakeholders by default", () => {
    const emails = getStakeholderEmails();
    expect(emails).toContain("Wondimubelete4@gmail.com");
    expect(emails).toContain("Zgenet19@gmail.com");
    expect(emails).toContain("leulsegedmelaku1020@gmail.com");
    expect(emails.length).toBe(3);
  });

  it("parses comma-separated custom env emails while retaining the 3 default stakeholders", () => {
    process.env.STAKEHOLDER_EMAILS = "director@columbiacareafh.com, manager@columbiacareafh.com";
    const emails = getStakeholderEmails();
    expect(emails).toContain("director@columbiacareafh.com");
    expect(emails).toContain("manager@columbiacareafh.com");
    expect(emails).toContain("Wondimubelete4@gmail.com");
    expect(emails).toContain("Zgenet19@gmail.com");
    expect(emails).toContain("leulsegedmelaku1020@gmail.com");
  });

  it("combines owner and stakeholder settings rather than dropping the owner", () => {
    process.env.OWNER_NOTIFICATION_EMAIL = "owner@example.test";
    process.env.STAKEHOLDER_EMAILS = "manager@example.test, OWNER@example.test";
    const emails = getStakeholderEmails();
    expect(emails[0]).toBe("owner@example.test");
    expect(emails).toContain("manager@example.test");
    expect(emails.filter((email) => email.toLowerCase() === "owner@example.test")).toHaveLength(1);
  });

  it("deduplicates case-insensitively", () => {
    process.env.STAKEHOLDER_EMAILS = "wondimubelete4@gmail.com, Extra@example.com";
    const emails = getStakeholderEmails();
    const lower = emails.map((e) => e.toLowerCase());
    const countWondimu = lower.filter((e) => e === "wondimubelete4@gmail.com").length;
    expect(countWondimu).toBe(1);
    expect(emails).toContain("Extra@example.com");
  });
});

describe("React Email templates rendering", () => {
  it("renders StakeholderEnquiryEmail properly", async () => {
    const html = await render(
      <StakeholderEnquiryEmail
        name="Sarah Jenkins"
        email="sarah@example.com"
        phone="(425) 555-1234"
        relationship="Mother"
        message="Looking for memory care support."
        preferredTimes={["Weekday mornings", "Weekend afternoons"]}
        adminUrl="https://columbiacareafh.com/admin/inquiries"
      />,
    );

    expect(html).toContain("Sarah Jenkins");
    expect(html).not.toContain("sarah@example.com");
    expect(html).toContain("(425) 555-1234");
    expect(html).toContain("Looking for memory care support.");
    expect(html).toContain("Weekday mornings");
    expect(html).not.toContain("Wondimubelete4@gmail.com");
    expect(html).not.toContain("Zgenet19@gmail.com");
    expect(html).not.toContain("leulsegedmelaku1020@gmail.com");
  });

  it("renders FamilyAutoReply properly", async () => {
    const html = await render(
      <FamilyAutoReply
        name="Sarah Jenkins"
        phone="(425) 212-9108"
        addressLine="1234 Columbia Way, Everett, WA 98208"
        locationLine="Minutes from Silver Lake"
      />,
    );

    expect(html).toContain("Sarah");
    expect(html).toContain("Columbia Care Adult Family Home");
    expect(html).toContain("1234 Columbia Way");
  });

  it("renders AdminCustomerReplyEmail properly", async () => {
    const html = await render(
      <AdminCustomerReplyEmail
        customerName="Sarah Jenkins"
        message="We would love to welcome you and your mother this Thursday at 2 PM."
        phone="(425) 212-9108"
        addressLine="1234 Columbia Way, Everett, WA 98208"
        senderName="Columbia Care Team"
      />,
    );

    expect(html).toContain("Sarah");
    expect(html).toContain("We would love to welcome you and your mother this Thursday at 2 PM.");
    expect(html).toContain("Columbia Care Team");
  });

  it("renders StakeholderStatusUpdateEmail properly", async () => {
    const html = await render(
      <StakeholderStatusUpdateEmail
        inquiryName="Sarah Jenkins"
        previousStatus="new"
        newStatus="contacted"
        notes="Spoke with daughter Sarah, tour scheduled for Thursday."
        updatedBy="owner@columbia.com"
        adminUrl="https://columbiacareafh.com/admin/inquiries"
      />,
    );

    expect(html).toContain("Sarah Jenkins");
    expect(html).toContain("Contacted");
    expect(html).toContain("Spoke with daughter Sarah");
    expect(html).not.toContain("Wondimubelete4@gmail.com");
    expect(html).not.toContain("Zgenet19@gmail.com");
    expect(html).not.toContain("leulsegedmelaku1020@gmail.com");
  });
});

describe("Email presentation privacy", () => {
  const examples = [
    <StakeholderEnquiryEmail
      name="Alex Taylor"
      email="family@example.test"
      phone={null}
      relationship="Family member"
      message="Could we arrange a visit?"
      preferredTimes={[]}
      adminUrl="https://columbiacareafh.com/admin/inquiries"
    />,
    <FamilyAutoReply
      name="Alex Taylor"
      phone="(425) 555-0199"
      addressLine={null}
      locationLine={null}
    />,
    <AdminCustomerReplyEmail
      customerName="Alex Taylor"
      message="Thank you for getting in touch."
      senderName="owner@example.test"
    />,
    <StakeholderStatusUpdateEmail
      inquiryName="Alex Taylor"
      previousStatus="new"
      newStatus="contacted"
      notes="A visit time was discussed."
      updatedBy="owner@example.test"
      adminUrl="https://columbiacareafh.com/admin/inquiries"
    />,
  ];
  for (const [index, element] of examples.entries()) {
    it(`keeps template ${index + 1} free of role labels and automatic email-address lists`, async () => {
      const html = await render(element);
      const text = toPlainText(html);
      expect(text).not.toMatch(/stakeholder|owner|distribution/i);
      expect(text).not.toContain("@");
      expect(html).not.toContain("owner@example.test");
      expect(html).not.toContain("family@example.test");
      expect(html).not.toContain("Wondimubelete4@gmail.com");
      expect(html).toContain("Columbia Care");
      expect(html).toContain('lang="en"');
    });
  }

  it("never presents the family's submitted phone as Columbia Care's contact number", async () => {
    const html = await render(examples[1]);
    expect(html).not.toContain("(425) 555-0199");
    expect(html).not.toContain("4255550199");
  });
});
