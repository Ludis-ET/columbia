import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { render } from "@react-email/components";
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
    expect(html).toContain("sarah@example.com");
    expect(html).toContain("(425) 555-1234");
    expect(html).toContain("Looking for memory care support.");
    expect(html).toContain("Weekday mornings");
    expect(html).toContain("Wondimubelete4@gmail.com");
    expect(html).toContain("Zgenet19@gmail.com");
    expect(html).toContain("leulsegedmelaku1020@gmail.com");
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
    expect(html).toContain("contacted");
    expect(html).toContain("Spoke with daughter Sarah");
    expect(html).toContain("Wondimubelete4@gmail.com");
    expect(html).toContain("Zgenet19@gmail.com");
    expect(html).toContain("leulsegedmelaku1020@gmail.com");
  });
});
