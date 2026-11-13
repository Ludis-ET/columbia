import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

const INK = "#10254A";
const SAGE = "#3F5528";
const PAPER = "#F6F5EE";
const WASH = "#E7EBDC";
const SITE_URL = "https://columbiacareafh.com";

const styles = {
  body: {
    backgroundColor: PAPER,
    color: INK,
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "18px",
    lineHeight: "1.65",
    margin: 0,
    padding: "24px 8px",
    WebkitTextSizeAdjust: "100%",
  },
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "#FFFFFF",
    border: `1px solid ${WASH}`,
    borderRadius: "4px",
  },
  header: { backgroundColor: INK, padding: "28px 32px", borderBottom: `4px solid ${SAGE}` },
  brand: {
    color: PAPER,
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "32px",
    lineHeight: "1.2",
    margin: 0,
  },
  brandDetail: { color: PAPER, fontSize: "16px", lineHeight: "1.5", margin: "8px 0 0" },
  content: { padding: "32px" },
  eyebrow: {
    color: SAGE,
    fontSize: "16px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    margin: "0 0 16px",
  },
  title: {
    color: INK,
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "30px",
    fontWeight: 400,
    lineHeight: "1.25",
    margin: "0 0 24px",
  },
  paragraph: { color: INK, fontSize: "18px", lineHeight: "1.65", margin: "0 0 20px" },
  panel: { backgroundColor: WASH, borderRadius: "4px", padding: "24px", margin: "24px 0" },
  field: { margin: "0 0 16px" },
  label: { color: SAGE, fontSize: "16px", lineHeight: "1.5", margin: "0 0 4px" },
  value: { color: INK, fontSize: "18px", lineHeight: "1.6", margin: 0, overflowWrap: "anywhere" },
  note: {
    color: INK,
    fontSize: "18px",
    lineHeight: "1.65",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    margin: "8px 0 0",
  },
  button: {
    backgroundColor: INK,
    color: "#FFFFFF",
    borderRadius: "4px",
    fontSize: "16px",
    lineHeight: "24px",
    fontWeight: 700,
    textDecoration: "none",
    padding: "14px 24px",
    textAlign: "center",
  },
  link: { color: SAGE, textDecoration: "underline" },
  small: { color: INK, fontSize: "16px", lineHeight: "1.6", margin: "20px 0 0" },
  footer: { padding: "24px 32px", backgroundColor: PAPER, borderTop: `1px solid ${WASH}` },
  footerText: { color: INK, fontSize: "16px", lineHeight: "1.6", margin: 0 },
} satisfies Record<string, CSSProperties>;

function EmailFrame({
  preview,
  category,
  title,
  children,
}: {
  preview: string;
  category: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <style>{`@media only screen and (max-width:480px){.email-header,.email-content,.email-footer{padding:24px 16px!important}.email-title{font-size:28px!important}.email-panel{padding:20px 16px!important}}`}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section className="email-header" style={styles.header}>
            <Text style={styles.brand}>Columbia Care</Text>
            <Text style={styles.brandDetail}>Adult Family Home</Text>
          </Section>
          <Section className="email-content" style={styles.content}>
            <Text style={styles.eyebrow}>{category}</Text>
            <Heading as="h1" className="email-title" style={styles.title}>
              {title}
            </Heading>
            {children}
          </Section>
          <Section className="email-footer" style={styles.footer}>
            <Text style={styles.footerText}>Columbia Care Adult Family Home</Text>
            <Text style={styles.footerText}>
              <Link href={SITE_URL} style={styles.link}>
                columbiacareafh.com
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Section style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{children}</Text>
    </Section>
  );
}

export interface EnquiryEmailProps {
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  message: string | null;
  preferredTimes: string[];
  adminUrl: string;
}

export function StakeholderEnquiryEmail({
  name,
  email,
  phone,
  relationship,
  message,
  preferredTimes,
  adminUrl,
}: EnquiryEmailProps) {
  const cleanPhone = phone?.replace(/\D/g, "");
  return (
    <EmailFrame
      preview={`A new house tour request from ${name}.`}
      category="New tour request"
      title={`${name} would like to visit`}
    >
      <Text style={styles.paragraph}>
        A new house tour request has arrived through the Columbia Care website.
      </Text>
      <Section className="email-panel" style={styles.panel}>
        <Field label="Contact name">{name}</Field>
        {phone ? (
          <Field label="Phone">
            <Link href={`tel:${cleanPhone}`} style={styles.link}>
              {phone}
            </Link>
          </Field>
        ) : null}
        {relationship ? <Field label="Relationship">{relationship}</Field> : null}
        {preferredTimes.length ? (
          <Field label="Preferred times">{preferredTimes.join(" · ")}</Field>
        ) : null}
        {message ? (
          <Section>
            <Text style={styles.label}>Message</Text>
            <Text style={styles.note}>{message}</Text>
          </Section>
        ) : null}
      </Section>
      <Button href={adminUrl} style={styles.button}>
        View visit request
      </Button>
      {email ? (
        <Text style={styles.small}>You can also reply to this email to contact {name}.</Text>
      ) : null}
    </EmailFrame>
  );
}

// Existing server imports can keep their internal names; role labels and
// distribution addresses are never passed into the rendered templates.
export const OwnerNotification = StakeholderEnquiryEmail;

export interface AutoReplyProps {
  name: string;
  phone?: string | null;
  addressLine: string | null;
  locationLine: string | null;
}

export function FamilyAutoReply({ name, addressLine, locationLine }: AutoReplyProps) {
  const firstName = name.trim().split(/\s+/)[0] || name;
  return (
    <EmailFrame
      preview="Your house tour request has been received."
      category="Your visit request"
      title={`Thank you, ${firstName}.`}
    >
      <Text style={styles.paragraph}>
        We’ve received your request for a house tour at Columbia Care Adult Family Home.
      </Text>
      <Text style={styles.paragraph}>
        We’ll be in touch to discuss a visit time and answer your questions.
      </Text>
      {addressLine || locationLine ? (
        <Section className="email-panel" style={styles.panel}>
          <Text style={styles.label}>Visiting Columbia Care</Text>
          {addressLine ? <Text style={styles.value}>{addressLine}</Text> : null}
          {locationLine ? <Text style={styles.small}>{locationLine}</Text> : null}
        </Section>
      ) : null}
      <Button href={SITE_URL} style={styles.button}>
        Visit our website
      </Button>
      <Text style={styles.small}>If you have another question, you can reply to this email.</Text>
    </EmailFrame>
  );
}

export interface AdminCustomerReplyProps {
  customerName: string;
  message: string;
  phone?: string | null;
  addressLine?: string | null;
  senderName?: string;
}

export function AdminCustomerReplyEmail({
  customerName,
  message,
  phone,
  addressLine,
}: AdminCustomerReplyProps) {
  const firstName = customerName.trim().split(/\s+/)[0] || customerName;
  return (
    <EmailFrame
      preview="A message from Columbia Care about your visit request."
      category="A message from Columbia Care"
      title={`Hello ${firstName},`}
    >
      <Text style={styles.note}>{message}</Text>
      <Text style={{ ...styles.paragraph, marginTop: "28px" }}>
        Warm regards,
        <br />
        <strong>Columbia Care Team</strong>
      </Text>
      {addressLine || phone ? (
        <Section className="email-panel" style={styles.panel}>
          {addressLine ? <Field label="Columbia Care">{addressLine}</Field> : null}
          {phone ? (
            <Field label="Phone">
              <Link href={`tel:${phone.replace(/\D/g, "")}`} style={styles.link}>
                {phone}
              </Link>
            </Field>
          ) : null}
        </Section>
      ) : null}
    </EmailFrame>
  );
}

export interface StakeholderStatusUpdateProps {
  inquiryName: string;
  previousStatus: string;
  newStatus: string;
  notes: string | null;
  updatedBy: string;
  adminUrl: string;
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function StakeholderStatusUpdateEmail({
  inquiryName,
  previousStatus,
  newStatus,
  notes,
  adminUrl,
}: StakeholderStatusUpdateProps) {
  return (
    <EmailFrame
      preview={`The visit request for ${inquiryName} has been updated.`}
      category="Request update"
      title={`An update for ${inquiryName}`}
    >
      <Text style={styles.paragraph}>
        The visit request has been updated. Open the request to see the latest details.
      </Text>
      <Section className="email-panel" style={styles.panel}>
        <Field label="Previous status">{statusLabel(previousStatus)}</Field>
        <Field label="Current status">{statusLabel(newStatus)}</Field>
        {notes ? (
          <Section>
            <Text style={styles.label}>Latest note</Text>
            <Text style={styles.note}>{notes}</Text>
          </Section>
        ) : null}
      </Section>
      <Button href={adminUrl} style={styles.button}>
        View visit request
      </Button>
    </EmailFrame>
  );
}
