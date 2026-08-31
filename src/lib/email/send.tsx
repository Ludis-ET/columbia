import { Resend } from "resend";
import { render } from "@react-email/components";
import { FamilyAutoReply, OwnerNotification, type EnquiryEmailProps } from "./templates";

/**
 * Email delivery.
 *
 * ---------------------------------------------------------------------------
 * EMAIL FAILURE MUST NEVER LOSE A LEAD.
 *
 * The enquiry is written to the database FIRST, and these functions are called
 * afterwards. If Resend is unconfigured, rate-limited or down, the family still
 * gets their confirmation screen and the owner still finds the enquiry in the
 * admin inbox. Every failure here is logged and swallowed.
 *
 * That ordering is the whole design. A care home losing a family's phone number
 * because an email provider had a bad afternoon is not acceptable.
 * ---------------------------------------------------------------------------
 */

const apiKey = process.env.RESEND_API_KEY;

/**
 * Who the mail comes from. Must be a domain verified in Resend, until the
 * domain is verified, Resend's shared onboarding sender is used, which only
 * delivers to the account owner's own address.
 */
const FROM = process.env.RESEND_FROM ?? "Columbia Care <onboarding@resend.dev>";

/** Where owner notifications go. Falls back to the published enquiry address. */
const OWNER_TO = process.env.OWNER_NOTIFICATION_EMAIL ?? null;

export const isEmailConfigured = Boolean(apiKey);

const resend = apiKey ? new Resend(apiKey) : null;

export interface SendResult {
  ownerNotified: boolean;
  familyNotified: boolean;
}

export async function sendEnquiryEmails(
  props: EnquiryEmailProps & { addressLine: string | null; locationLine: string | null },
): Promise<SendResult> {
  const result: SendResult = { ownerNotified: false, familyNotified: false };

  if (!resend) {
    console.warn("[email] RESEND_API_KEY is not set, enquiry saved, no email sent.");
    return result;
  }

  const ownerTo = OWNER_TO;
  if (!ownerTo) {
    console.warn(
      "[email] OWNER_NOTIFICATION_EMAIL is not set, nobody will be told about this enquiry.",
    );
  }

  // Owner first: if only one of the two can go out, it must be this one.
  if (ownerTo) {
    try {
      const html = await render(<OwnerNotification {...props} />);
      const { error } = await resend.emails.send({
        from: FROM,
        to: ownerTo,
        subject: `New enquiry from ${props.name}${props.phone ? ` ${props.phone}` : ""}`,
        html,
        // So the owner can hit reply and reach the family directly.
        replyTo: props.email ?? undefined,
      });
      if (error) console.warn("[email] owner notification failed:", error.message);
      else result.ownerNotified = true;
    } catch (error) {
      console.warn("[email] owner notification threw:", error);
    }
  }

  if (props.email) {
    try {
      const html = await render(
        <FamilyAutoReply
          name={props.name}
          phone={props.phone}
          addressLine={props.addressLine}
          locationLine={props.locationLine}
        />,
      );
      const { error } = await resend.emails.send({
        from: FROM,
        to: props.email,
        subject: "We have your message, Columbia Care Adult Family Home",
        html,
        replyTo: ownerTo ?? undefined,
      });
      if (error) console.warn("[email] auto-reply failed:", error.message);
      else result.familyNotified = true;
    } catch (error) {
      console.warn("[email] auto-reply threw:", error);
    }
  }

  return result;
}
