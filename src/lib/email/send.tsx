import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { readSmtpSettings, smtpErrorMessage } from "./smtp-config";
import { Resend } from "resend";
import { z } from "zod";
import { render, toPlainText } from "@react-email/components";
import type React from "react";
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
 * Supports dual engines:
 * 1. cPanel SMTP (Primary when configured) — Direct hosting email server (e.g. mail.columbiacareafh.com)
 * 2. Resend API (Used when SMTP is not configured)
 *
 * ---------------------------------------------------------------------------
 * EMAIL FAILURE MUST NEVER LOSE A LEAD OR BLOCK AN ACTION.
 *
 * The enquiry or action is written to the database FIRST. If email delivery is
 * unconfigured or encounters a network issue, the lead is safely recorded in
 * Supabase and available in the admin console. Every error is logged.
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
  const configured = [
    process.env.OWNER_NOTIFICATION_EMAIL ?? "",
    process.env.STAKEHOLDER_EMAILS ?? "",
  ].flatMap((raw) => raw.split(","));
  const normalized = new Set<string>();
  const result: string[] = [];
  for (const address of [...configured, ...DEFAULT_STAKEHOLDERS]) {
    const email = address.trim();
    if (email && email.includes("@") && !normalized.has(email.toLowerCase())) {
      result.push(email);
      normalized.add(email.toLowerCase());
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Provider Configuration
// ---------------------------------------------------------------------------

export function getEmailConfiguration() {
  const smtp = readSmtpSettings();
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  return {
    smtpConfigured: smtp.options !== null,
    resendConfigured,
    sender: smtp.options ? smtp.from : process.env.RESEND_FROM || null,
    recipients: getStakeholderEmails(),
    missing: smtp.missing,
    errors: smtp.errors,
  };
}

let cachedTransporter: {
  key: string;
  transporter: Transporter<SMTPTransport.SentMessageInfo>;
} | null = null;

function getSmtpTransporter(options: SMTPTransport.Options) {
  // Credentials stay in server memory. Nothing in this cache is returned to UI.
  const key = JSON.stringify(options);
  if (!cachedTransporter || cachedTransporter.key !== key) {
    cachedTransporter = { key, transporter: nodemailer.createTransport(options) };
  }
  return cachedTransporter.transporter;
}

export async function verifyEmailConnection(): Promise<{ ok: boolean; message: string }> {
  const smtp = readSmtpSettings();
  if (!smtp.options) {
    return {
      ok: false,
      message: smtp.errors.length
        ? smtp.errors.join(" ")
        : "Add " +
          smtp.missing.join(", ") +
          " in cPanel Setup Node.js App, then restart the application.",
    };
  }
  try {
    // verify authenticates without MAIL FROM, RCPT TO or DATA: no email is sent.
    await getSmtpTransporter(smtp.options).verify();
    return {
      ok: true,
      message:
        "The mail server accepted the connection and mailbox login. No email was sent. Inbox delivery still needs a test inquiry.",
    };
  } catch (error) {
    const message = smtpErrorMessage(error);
    console.warn("[email] SMTP connection check failed:", message);
    return { ok: false, message };
  }
}

interface DispatchMailOptions {
  from?: string;
  to: string;
  replyTo?: string;
  subject: string;
  react: React.ReactElement;
}

/**
 * Unified mail dispatcher that handles either cPanel SMTP or Resend.
 */
async function dispatchEmail(
  options: DispatchMailOptions,
): Promise<{ success: boolean; error?: string }> {
  // Guard the actual provider boundary too: a string containing multiple
  // addresses must never become a grouped To header.
  const recipient = z.string().trim().email().safeParse(options.to);
  if (!recipient.success) {
    return { success: false, error: "A single valid recipient address is required." };
  }
  const smtp = readSmtpSettings();

  if (smtp.options) {
    try {
      const transporter = getSmtpTransporter(smtp.options);
      const html = await render(options.react);
      const info = await transporter.sendMail({
        from: options.from || smtp.from || undefined,
        to: recipient.data,
        replyTo: options.replyTo,
        subject: options.subject,
        html,
        text: toPlainText(html),
      });
      if (!info.accepted?.length || info.rejected?.length) {
        console.warn("[email] SMTP did not accept every recipient:", {
          accepted: info.accepted?.length ?? 0,
          rejected: info.rejected?.length ?? 0,
          messageId: info.messageId,
        });
        return {
          success: false,
          error: "The mail server did not accept every recipient. Check cPanel Track Delivery.",
        };
      }
      console.info("[email] SMTP accepted message:", {
        messageId: info.messageId,
        recipients: info.accepted.length,
      });
      return { success: true };
    } catch (error) {
      const message = smtpErrorMessage(error);
      console.warn("[email] cPanel SMTP dispatch failed:", message);
      return { success: false, error: message };
    }
  }

  // Resend is used only when SMTP is not configured, avoiding duplicate
  // deliveries if SMTP accepted DATA but its final response was lost.
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from:
          options.from ||
          process.env.RESEND_FROM ||
          smtp.from ||
          "Columbia Care <onboarding@resend.dev>",
        to: recipient.data,
        replyTo: options.replyTo,
        subject: options.subject,
        react: options.react,
        text: toPlainText(await render(options.react)),
      });
      if (error) {
        console.warn("[email] Resend rejected the notification.");
        return {
          success: false,
          error: "The email provider rejected the notification. Check its delivery log.",
        };
      }
      return { success: true };
    } catch {
      console.warn("[email] Resend dispatch failed.");
      return { success: false, error: "The email provider could not send the notification." };
    }
  }

  const message = smtp.errors.length
    ? smtp.errors.join(" ")
    : "Missing cPanel email settings: " + smtp.missing.join(", ");
  console.warn("[email]", message);
  return { success: false, error: message };
}

// Send separate messages with separate IDs, limiting simultaneous SMTP
// connections. A failed recipient must not prevent the remaining attempts.
async function dispatchIndividually(
  recipients: string[],
  message: Omit<DispatchMailOptions, "to">,
): Promise<{ success: boolean; error?: string }> {
  let firstError: string | undefined;
  for (let offset = 0; offset < recipients.length; offset += 3) {
    const results = await Promise.all(
      recipients.slice(offset, offset + 3).map((to) => dispatchEmail({ ...message, to })),
    );
    for (const result of results) {
      if (!result.success) firstError ??= result.error || "A notification could not be sent.";
    }
  }
  return firstError ? { success: false, error: firstError } : { success: true };
}

function businessReplyTo() {
  return getEmailConfiguration().sender ?? undefined;
}

// ---------------------------------------------------------------------------
// Public Operations
// ---------------------------------------------------------------------------

export interface SendResult {
  ownerNotified: boolean;
  familyNotified: boolean;
}

/**
 * Dispatches notification emails when a customer submits a tour inquiry.
 * Sends each notification privately and auto-replies to the family.
 */
export async function sendEnquiryEmails(
  props: EnquiryEmailProps & { addressLine: string | null; locationLine: string | null },
): Promise<SendResult> {
  const result: SendResult = { ownerNotified: false, familyNotified: false };

  const stakeholders = getStakeholderEmails();

  // 1. Deliver to all 3 stakeholders
  if (stakeholders.length > 0) {
    const stakeholderRes = await dispatchIndividually(stakeholders, {
      subject: `New visit request from ${props.name}`,
      react: <StakeholderEnquiryEmail {...props} />,
      replyTo: props.email ?? undefined,
    });
    if (stakeholderRes.success) result.ownerNotified = true;
  }

  // 2. Deliver confirmation to family if they provided an email address
  if (props.email) {
    const familyRes = await dispatchEmail({
      to: props.email,
      subject: "We received your visit request — Columbia Care Adult Family Home",
      react: (
        <FamilyAutoReply
          name={props.name}
          addressLine={props.addressLine}
          locationLine={props.locationLine}
        />
      ),
      replyTo: businessReplyTo(),
    });
    if (familyRes.success) result.familyNotified = true;
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
 * Sends separate private copies to notification recipients after customer delivery.
 */
export async function sendAdminReplyEmail(
  props: AdminReplyEmailProps,
): Promise<{ success: boolean; error?: string; copiesNotified?: boolean }> {
  const message = {
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
    replyTo: businessReplyTo(),
  };
  const customer = await dispatchEmail({ ...message, to: props.customerEmail });
  if (!customer.success) return customer;

  const copies = getStakeholderEmails().filter(
    (address) => address.toLowerCase() !== props.customerEmail.trim().toLowerCase(),
  );
  const notifications = await dispatchIndividually(copies, message);
  if (!notifications.success) {
    console.warn("[email] Customer reply sent, but some private notification copies failed.");
  }
  // Customer delivery has succeeded. Do not invite a duplicate customer email
  // by reporting this as a failed send when only a notification copy failed.
  return { success: true, copiesNotified: notifications.success };
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
  const stakeholders = getStakeholderEmails();
  if (stakeholders.length === 0) return false;

  const res = await dispatchIndividually(stakeholders, {
    subject: `Inquiry Pipeline Update: ${props.inquiryName} → ${props.newStatus}`,
    react: <StakeholderStatusUpdateEmail {...props} />,
  });

  return res.success;
}
