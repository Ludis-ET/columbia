import type SMTPTransport from "nodemailer/lib/smtp-transport";

export function readSmtpSettings(env: Record<string, string | undefined> = process.env) {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS;
  const missing = [!host && "SMTP_HOST", !user && "SMTP_USER", !pass && "SMTP_PASS"].filter(
    (name): name is string => Boolean(name),
  );
  const errors: string[] = [];
  const port = Number(env.SMTP_PORT || "465");
  const rawSecure = env.SMTP_SECURE?.trim().toLowerCase();
  const secure = rawSecure === undefined || rawSecure === "" ? port === 465 : rawSecure === "true";
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push("SMTP_PORT must be a valid port number, usually 465 or 587.");
  }
  if (rawSecure && !["true", "false"].includes(rawSecure)) {
    errors.push("SMTP_SECURE must be true or false.");
  }
  if (port === 465 && !secure) errors.push("Port 465 requires SMTP_SECURE=true.");
  if (port === 587 && secure) errors.push("Port 587 requires SMTP_SECURE=false and STARTTLS.");
  if (host && (/\s/.test(host) || host.includes("://"))) {
    errors.push(
      "SMTP_HOST must contain only the outgoing server address, without a URL or spaces.",
    );
  }
  const from = env.SMTP_FROM?.trim() || (user ? `Columbia Care <${user}>` : null);
  const options: SMTPTransport.Options | null =
    missing.length || errors.length
      ? null
      : {
          host,
          port,
          secure,
          requireTLS: !secure,
          auth: { user, pass },
          connectionTimeout: 20000,
          greetingTimeout: 10000,
          socketTimeout: 30000,
          dnsTimeout: 10000,
          tls: {
            rejectUnauthorized: true,
            servername: env.SMTP_TLS_SERVER_NAME?.trim() || host,
          },
        };
  return { options, from, missing, errors };
}

export function smtpErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  if (code === "EAUTH") {
    return "SMTP login failed. Use the full mailbox address and its email-account password, not the cPanel login password.";
  }
  if (["EDNS", "ENOTFOUND", "EAI_AGAIN"].includes(String(code))) {
    return "The outgoing mail server could not be found. Check SMTP_HOST against cPanel Email Accounts > Connect Devices.";
  }
  if (["ETIMEDOUT", "ECONNECTION", "ECONNREFUSED"].includes(String(code))) {
    return "The outgoing mail server could not be reached. Check SMTP_HOST, SMTP_PORT and the hosting provider's connection limits.";
  }
  if (
    [
      "ESOCKET",
      "ETLS",
      "CERT_HAS_EXPIRED",
      "ERR_TLS_CERT_ALTNAME_INVALID",
      "DEPTH_ZERO_SELF_SIGNED_CERT",
      "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    ].includes(String(code))
  ) {
    return "The secure mail connection failed. Use the Secure SSL/TLS outgoing server name from cPanel and check the port and certificate.";
  }
  if (code === "EENVELOPE") {
    return "The mail server rejected a sender or recipient. Check SMTP_FROM and the notification addresses.";
  }
  // Do not return raw SMTP responses: servers can echo authentication details.
  return "The mail operation failed. Check cPanel Email > Track Delivery and the application's email error log.";
}
