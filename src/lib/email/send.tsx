import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { render } from "@react-email/components";
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
 * 2. Resend API (Secondary / Fallback)
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

// ---------------------------------------------------------------------------
// Provider Configuration
// ---------------------------------------------------------------------------

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
const SMTP_SECURE = process.env.SMTP_SECURE === "false" ? false : SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

export const isSmtpConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const resendApiKey = process.env.RESEND_API_KEY;
export const isResendConfigured = Boolean(resendApiKey);

export const isEmailConfigured = isSmtpConfigured || isResendConfigured;

const DEFAULT_FROM =
  process.env.SMTP_FROM ||
  process.env.RESEND_FROM ||
  (SMTP_USER ? `Columbia Care <${SMTP_USER}>` : "Columbia Care <onboarding@resend.dev>");

let cachedTransporter: Transporter | null = null;
function getSmtpTransporter() {
  if (!cachedTransporter && isSmtpConfigured) {
    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Prevents self-signed cert blocks on cPanel
      },
    });
  }
  return cachedTransporter;
}

const resend = isResendConfigured ? new Resend(resendApiKey) : null;

interface DispatchMailOptions {
  from?: string;
  to: string | string[];
  bcc?: string | string[];
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
  const from = options.from || DEFAULT_FROM;

  // 1. Prefer cPanel SMTP if configured
  if (isSmtpConfigured) {
    try {
      const transporter = getSmtpTransporter();
      if (!transporter) throw new Error("Could not initialize cPanel SMTP transporter.");

      const html = await render(options.react);
      await transporter.sendMail({
        from,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        bcc: options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc.join(", ")
            : options.bcc
          : undefined,
        replyTo: options.replyTo,
        subject: options.subject,
        html,
      });

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[email] cPanel SMTP dispatch failed:", message);
      return { success: false, error: message };
    }
  }

  // 2. Fall back to Resend API
  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from,
        to: options.to,
        bcc: options.bcc,
        replyTo: options.replyTo,
        subject: options.subject,
        react: options.react,
      });

      if (error) {
        console.warn("[email] Resend dispatch failed:", error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[email] Resend dispatch threw:", message);
      return { success: false, error: message };
    }
  }

  console.warn(
    "[email] No email service configured. Please set SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) or RESEND_API_KEY in .env.local",
  );
  return { success: false, error: "No email service configured." };
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
 * Delivers to all 3 stakeholders simultaneously and auto-replies to the family.
 */
export async function sendEnquiryEmails(
  props: EnquiryEmailProps & { addressLine: string | null; locationLine: string | null },
): Promise<SendResult> {
  const result: SendResult = { ownerNotified: false, familyNotified: false };

  if (!isEmailConfigured) {
    console.warn("[email] Email is not configured. Enquiry saved in DB; email delivery skipped.");
    return result;
  }

  const stakeholders = getStakeholderEmails();

  // 1. Deliver to all 3 stakeholders
  if (stakeholders.length > 0) {
    const stakeholderRes = await dispatchEmail({
      to: stakeholders,
      subject: `New Tour Request from ${props.name}${props.phone ? ` (${props.phone})` : ""}`,
      react: <StakeholderEnquiryEmail {...props} stakeholders={stakeholders} />,
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
          phone={props.phone}
          addressLine={props.addressLine}
          locationLine={props.locationLine}
        />
      ),
      replyTo: stakeholders[0],
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
 * Automatically sends BCC copies to all 3 stakeholders so everyone is kept in the loop.
 */
export async function sendAdminReplyEmail(
  props: AdminReplyEmailProps,
): Promise<{ success: boolean; error?: string }> {
  if (!isEmailConfigured) {
    return {
      success: false,
      error: "No email service configured (missing SMTP or Resend credentials in .env.local).",
    };
  }

  const stakeholders = getStakeholderEmails();

  return dispatchEmail({
    to: props.customerEmail,
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
  if (!isEmailConfigured) return false;

  const stakeholders = getStakeholderEmails();
  if (stakeholders.length === 0) return false;

  const res = await dispatchEmail({
    to: stakeholders,
    subject: `Inquiry Pipeline Update: ${props.inquiryName} → ${props.newStatus}`,
    react: <StakeholderStatusUpdateEmail {...props} stakeholders={stakeholders} />,
  });

  return res.success;
}
