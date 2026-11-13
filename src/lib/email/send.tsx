import { Resend } from "resend";
import {
  AdminCustomerReplyEmail,
  FamilyAutoReply,
  StakeholderEnquiryEmail,
  StakeholderStatusUpdateEmail,
  type EnquiryEmailProps,
} from "./templates";

/**
 * Columbia Care Email Delivery System.
 *
 * ---------------------------------------------------------------------------
 * EMAIL FAILURE MUST NEVER LOSE A LEAD OR BLOCK AN ACTION.
 *
 * The enquiry or action is written to the database FIRST. If Resend is
 * unconfigured, rate-limited, or down, the user/admin still receives
 * confirmation and records are fully preserved in the database.
 * Every error here is logged with structured warnings.
 * ---------------------------------------------------------------------------
 */

/**
 * The three primary stakeholders who must receive every customer and admin interaction:
 * 1. Wondimubelete4@gmail.com
 * 2. Zgenet19@gmail.com
 * 3. leulsegedmelaku1020@gmail.com
 */
export const DEFAULT_STAKEHOLDERS: readonly string[] = [
  "Wondimubelete4@gmail.com",
  "Zgenet19@gmail.com",
  "leulsegedmelaku1020@gmail.com",
];

/**
 * Resolves stakeholder email addresses from configuration and defaults.
 * Guaranteed to return all 3 configured stakeholders plus any additional
 * addresses specified in environment variables.
 */
export function getStakeholderEmails(): string[] {
  const envRaw = process.env.STAKEHOLDER_EMAILS || process.env.OWNER_NOTIFICATION_EMAIL || "";
  const list = envRaw
    .split(",")
    .map((e) => e.trim())
    .filter((e) => Boolean(e) && e.includes("@"));

  const normalized = new Set(list.map((e) => e.toLowerCase()));
  const result = [...list];

  for (const fallback of DEFAULT_STAKEHOLDERS) {
    if (!normalized.has(fallback.toLowerCase())) {
      result.push(fallback);
      normalized.add(fallback.toLowerCase());
    }
  }

  return result;
}

const apiKey = process.env.RESEND_API_KEY;

/**
 * Senders must use a domain verified in Resend. When unverified, Resend's
 * shared onboarding sender is used for local development.
 */
const FROM = process.env.RESEND_FROM ?? "Columbia Care <onboarding@resend.dev>";

export const isEmailConfigured = Boolean(apiKey);

const resend = apiKey ? new Resend(apiKey) : null;

export interface SendResult {
  ownerNotified: boolean;
  familyNotified: boolean;
}

/**
 * Dispatches notification emails when a customer submits a tour inquiry.
 * Delivers to all 3 stakeholders simultaneously and auto-replies to the family.
 */
export async function sendEnquiryEmails(
  props: EnquiryEmailProps & { addressLine: string | null; locationLine: string | null },
): Promise<SendResult> {
  const result: SendResult = { ownerNotified: false, familyNotified: false };

  if (!resend) {
    console.warn("[email] RESEND_API_KEY is not set. Enquiry saved in DB; email delivery skipped.");
    return result;
  }

  const stakeholders = getStakeholderEmails();

  // 1. Deliver to all stakeholders
  if (stakeholders.length > 0) {
    try {
      const { error } = await resend.emails.send({
        from: FROM,
        to: stakeholders,
        subject: `New Tour Request from ${props.name}${props.phone ? ` (${props.phone})` : ""}`,
        react: <StakeholderEnquiryEmail {...props} stakeholders={stakeholders} />,
        // Direct reply hits the customer so stakeholders can answer immediately with one click
        replyTo: props.email ?? undefined,
      });

      if (error) {
        console.warn("[email] Stakeholder notification failed:", error.message);
      } else {
        result.ownerNotified = true;
      }
    } catch (error) {
      console.warn("[email] Stakeholder notification threw:", error);
    }
  }

  // 2. Deliver confirmation to family if they provided an email address
  if (props.email) {
    try {
      const { error } = await resend.emails.send({
        from: FROM,
        to: props.email,
        subject: "We received your visit request — Columbia Care Adult Family Home",
        react: (
          <FamilyAutoReply
            name={props.name}
            phone={props.phone}
            addressLine={props.addressLine}
            locationLine={props.locationLine}
          />
        ),
        replyTo: stakeholders[0],
      });

      if (error) {
        console.warn("[email] Family auto-reply failed:", error.message);
      } else {
        result.familyNotified = true;
      }
    } catch (error) {
      console.warn("[email] Family auto-reply threw:", error);
    }
  }

  return result;
}

export interface AdminReplyEmailProps {
  customerEmail: string;
  customerName: string;
  subject: string;
  message: string;
  senderName?: string;
  phone?: string | null;
  addressLine?: string | null;
}

/**
 * Dispatches an outbound email written by an admin from the console directly to a family.
 * Automatically sends BCC copies to all 3 stakeholders so everyone is kept in the loop.
 */
export async function sendAdminReplyEmail(
  props: AdminReplyEmailProps,
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return {
      success: false,
      error: "RESEND_API_KEY is not configured on the server. Email could not be sent.",
    };
  }

  const stakeholders = getStakeholderEmails();

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: props.customerEmail,
      // BCC all 3 stakeholders so they receive the exact reply sent to the family
      bcc: stakeholders,
      subject: props.subject,
      react: (
        <AdminCustomerReplyEmail
          customerName={props.customerName}
          message={props.message}
          phone={props.phone}
          addressLine={props.addressLine}
          senderName={props.senderName}
        />
      ),
      replyTo: stakeholders[0],
    });

    if (error) {
      console.warn("[email] Admin reply to customer failed:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.warn("[email] Admin reply threw:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unexpected email delivery error",
    };
  }
}

export interface StatusAlertProps {
  inquiryName: string;
  previousStatus: string;
  newStatus: string;
  notes: string | null;
  updatedBy: string;
  adminUrl: string;
}

/**
 * Dispatches an instant status update notification to all 3 stakeholders
 * whenever an enquiry is moved to a new pipeline stage or notes are saved.
 */
export async function sendStakeholderStatusAlert(props: StatusAlertProps): Promise<boolean> {
  if (!resend) return false;

  const stakeholders = getStakeholderEmails();
  if (stakeholders.length === 0) return false;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: stakeholders,
      subject: `Inquiry Pipeline Update: ${props.inquiryName} → ${props.newStatus}`,
      react: <StakeholderStatusUpdateEmail {...props} stakeholders={stakeholders} />,
    });

    if (error) {
      console.warn("[email] Stakeholder status alert failed:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[email] Stakeholder status alert threw:", error);
    return false;
  }
}
