"use client";

import { useActionState } from "react";
import { checkEmailConnection, type EmailConnectionState } from "@/app/admin/email-actions";
import { AdminCard, AdminSection } from "@/components/admin/cards";
import { Button } from "@/components/ui/button";

interface EmailStatusProps {
  configuration: {
    smtpConfigured: boolean;
    resendConfigured: boolean;
    sender: string | null;
    recipients: string[];
    missing: string[];
    errors: string[];
  };
}

export function EmailStatus({ configuration }: EmailStatusProps) {
  const [result, action, pending] = useActionState<EmailConnectionState | null>(
    checkEmailConnection,
    null,
  );
  return (
    <div className="mb-8">
      <AdminSection
        title="Email notifications"
        lead="Check the sending account and notification recipients before testing a tour inquiry."
      >
        <AdminCard className="space-y-4 p-6">
          <p>
            {configuration.smtpConfigured
              ? "SMTP settings are present. Check the connection to confirm the mailbox login."
              : "SMTP settings need attention in cPanel Setup Node.js App."}
          </p>
          {configuration.sender ? <p>Sender: {configuration.sender}</p> : null}
          <div>
            <p className="font-semibold">Owner and stakeholder recipients</p>
            <ul className="mt-2 list-inside list-disc">
              {configuration.recipients.map((email) => (
                <li key={email}>{email}</li>
              ))}
            </ul>
          </div>
          {configuration.missing.length ? (
            <p>Missing settings: {configuration.missing.join(", ")}.</p>
          ) : null}
          {configuration.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
          {configuration.resendConfigured && !configuration.smtpConfigured ? (
            <p>Resend is configured as the current email provider.</p>
          ) : null}
          <form action={action} className="space-y-3">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Checking connection…" : "Check SMTP connection"}
            </Button>
            <p className="text-stone text-sm">
              This checks the mail server login without sending an email. Restart the app after
              changing cPanel settings.
            </p>
            {result ? (
              <p role="status" aria-live="polite">
                {result.message}
              </p>
            ) : null}
          </form>
        </AdminCard>
      </AdminSection>
    </div>
  );
}
