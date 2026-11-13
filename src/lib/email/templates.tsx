import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/**
 * Columbia Care Adult Family Home — Transactional Email Templates
 *
 * Designed with responsive typography, cross-client safe inline CSS, and Columbia Care's
 * serene, dignified brand aesthetic (Navy, Sage, Cream Paper, and Warm Stone).
 */

const INK = "#10254A";
const SAGE = "#3F5528";
const SAGE_LIGHT = "#EAF1E4";
const SAGE_BORDER = "#B8CEAD";
const PAPER = "#F6F5EE";
const CARD_BG = "#FFFFFF";
const STONE = "#5C6152";
const STONE_LIGHT = "#7C8274";
const RULE = "#E4E3D8";

const styles = {
  body: {
    backgroundColor: PAPER,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    margin: 0,
    padding: "32px 16px",
    WebkitTextSizeAdjust: "100%",
  },
  container: {
    maxWidth: "580px",
    margin: "0 auto",
  },
  card: {
    backgroundColor: CARD_BG,
    border: `1px solid ${RULE}`,
    borderRadius: "10px",
    padding: "36px 32px",
    boxShadow: "0 2px 8px rgba(16, 37, 74, 0.04)",
  },
  brandHeader: {
    marginBottom: "24px",
    paddingBottom: "18px",
    borderBottom: `1px solid ${RULE}`,
  },
  brandSuper: {
    color: SAGE,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
    margin: "0 0 4px",
  },
  brandTitle: {
    color: INK,
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "20px",
    fontWeight: 700,
    lineHeight: "1.2",
    margin: "0",
  },
  pillBadge: {
    display: "inline-block",
    backgroundColor: SAGE_LIGHT,
    color: SAGE,
    border: `1px solid ${SAGE_BORDER}`,
    borderRadius: "16px",
    padding: "4px 12px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    margin: "0 0 16px",
  },
  h1: {
    color: INK,
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "24px",
    lineHeight: "1.3",
    fontWeight: 600,
    margin: "0 0 16px",
  },
  p: {
    color: INK,
    fontSize: "15px",
    lineHeight: "1.6",
    margin: "0 0 16px",
  },
  lead: {
    color: INK,
    fontSize: "16px",
    lineHeight: "1.6",
    margin: "0 0 18px",
  },
  metaText: {
    color: STONE,
    fontSize: "13px",
    lineHeight: "1.5",
    margin: "0 0 12px",
  },
  fieldGrid: {
    backgroundColor: "#FAF9F5",
    border: `1px solid ${RULE}`,
    borderRadius: "8px",
    padding: "20px 22px",
    margin: "20px 0",
  },
  fieldLabel: {
    color: STONE_LIGHT,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    margin: "0 0 4px",
  },
  fieldValue: {
    color: INK,
    fontSize: "15px",
    fontWeight: 600,
    margin: "0 0 16px",
  },
  quoteBox: {
    backgroundColor: PAPER,
    borderLeft: `3px solid ${SAGE}`,
    borderRadius: "0 6px 6px 0",
    padding: "16px 18px",
    margin: "18px 0",
    color: INK,
    fontSize: "15px",
    lineHeight: "1.6",
    fontStyle: "italic",
  },
  btnPrimary: {
    backgroundColor: SAGE,
    color: "#FFFFFF",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    padding: "12px 22px",
    margin: "10px 10px 10px 0",
  },
  btnSecondary: {
    backgroundColor: "#F2F3EC",
    color: INK,
    border: `1px solid ${RULE}`,
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
    textAlign: "center" as const,
    display: "inline-block",
    padding: "11px 20px",
    margin: "10px 0",
  },
  divider: {
    borderColor: RULE,
    borderStyle: "solid",
    borderWidth: "1px 0 0",
    margin: "24px 0",
  },
  footer: {
    marginTop: "24px",
    textAlign: "center" as const,
  },
  footerText: {
    color: STONE,
    fontSize: "12px",
    lineHeight: "1.5",
    margin: "0 0 6px",
  },
  stakeholderBadge: {
    backgroundColor: "#EDECE4",
    borderRadius: "4px",
    color: STONE,
    fontSize: "11px",
    padding: "2px 6px",
    display: "inline-block",
    margin: "2px 4px",
  },
};

// ---------------------------------------------------------------------------
// 1. Stakeholder Inquiry Notification (Inbound Lead)
// ---------------------------------------------------------------------------

export interface EnquiryEmailProps {
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  message: string | null;
  preferredTimes: string[];
  adminUrl: string;
  stakeholders?: string[];
}

export function StakeholderEnquiryEmail({
  name,
  email,
  phone,
  relationship,
  message,
  preferredTimes,
  adminUrl,
  stakeholders = [
    "Wondimubelete4@gmail.com",
    "Zgenet19@gmail.com",
    "leulsegedmelaku1020@gmail.com",
  ],
}: EnquiryEmailProps) {
  const cleanPhone = phone ? phone.replace(/\D/g, "") : null;

  return (
    <Html>
      <Head />
      <Preview>{`New Tour Request from ${name}${phone ? ` (${phone})` : ""}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            {/* Header */}
            <div style={styles.brandHeader}>
              <Text style={styles.brandSuper}>Columbia Care Adult Family Home</Text>
              <Heading style={styles.brandTitle}>Stakeholder Notification</Heading>
            </div>

            {/* Status Pill */}
            <div style={styles.pillBadge}>New House Tour Request</div>

            <Heading style={styles.h1}>Inquiry from {name}</Heading>

            <Text style={styles.lead}>
              A family member has requested a house tour via the website. Families typically reach
              out to 2–3 homes at a time; early contact makes the biggest impression.
            </Text>

            {/* Details Card */}
            <div style={styles.fieldGrid}>
              <Text style={styles.fieldLabel}>Family Contact</Text>
              <Text style={styles.fieldValue}>{name}</Text>

              {phone ? (
                <>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <Text style={styles.fieldValue}>
                    <Link
                      href={`tel:${cleanPhone}`}
                      style={{ color: SAGE, textDecoration: "none" }}
                    >
                      {phone}
                    </Link>
                  </Text>
                </>
              ) : null}

              {email ? (
                <>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <Text style={styles.fieldValue}>
                    <Link href={`mailto:${email}`} style={{ color: SAGE, textDecoration: "none" }}>
                      {email}
                    </Link>
                  </Text>
                </>
              ) : null}

              {relationship ? (
                <>
                  <Text style={styles.fieldLabel}>Who they are inquiring for</Text>
                  <Text style={styles.fieldValue}>{relationship}</Text>
                </>
              ) : null}

              {preferredTimes && preferredTimes.length > 0 ? (
                <>
                  <Text style={styles.fieldLabel}>Preferred Tour Times</Text>
                  <Text style={{ ...styles.fieldValue, marginBottom: message ? "16px" : "0" }}>
                    {preferredTimes.join(" • ")}
                  </Text>
                </>
              ) : null}

              {message ? (
                <>
                  <Text style={styles.fieldLabel}>Their Personal Message</Text>
                  <div style={styles.quoteBox}>&ldquo;{message}&rdquo;</div>
                </>
              ) : null}
            </div>

            {/* Action Buttons */}
            <div>
              <Button href={adminUrl} style={styles.btnPrimary}>
                Open in Admin Console →
              </Button>
              {cleanPhone ? (
                <Button href={`tel:${cleanPhone}`} style={styles.btnSecondary}>
                  Call {phone}
                </Button>
              ) : null}
            </div>

            <Hr style={styles.divider} />

            {/* Footer with Stakeholder Distribution Notice */}
            <div style={{ textAlign: "left" }}>
              <Text style={styles.metaText}>
                <strong>Stakeholder Distribution:</strong> Delivered to Columbia Care leadership:
              </Text>
              <div style={{ margin: "6px 0 14px" }}>
                {stakeholders.map((sh) => (
                  <span key={sh} style={styles.stakeholderBadge}>
                    {sh}
                  </span>
                ))}
              </div>
              <Text style={{ ...styles.metaText, fontSize: "12px", color: STONE_LIGHT }}>
                This is an automated dispatch from the Columbia Care Adult Family Home website
                system.
              </Text>
            </div>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Backward-compatible alias
export const OwnerNotification = StakeholderEnquiryEmail;

// ---------------------------------------------------------------------------
// 2. Customer Auto-Reply (Family Confirmation)
// ---------------------------------------------------------------------------

export interface AutoReplyProps {
  name: string;
  phone: string | null;
  addressLine: string | null;
  locationLine: string | null;
}

export function FamilyAutoReply({ name, phone, addressLine, locationLine }: AutoReplyProps) {
  const firstName = name.trim().split(/\s+/)[0] || name;

  return (
    <Html>
      <Head />
      <Preview>Thank you for reaching out to Columbia Care Adult Family Home</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            {/* Header */}
            <div style={styles.brandHeader}>
              <Text style={styles.brandSuper}>Columbia Care Adult Family Home</Text>
              <Heading style={styles.brandTitle}>A place to feel at home</Heading>
            </div>

            <Heading style={styles.h1}>Thank you, {firstName}</Heading>

            <Text style={styles.lead}>
              We have received your tour request. Someone from our leadership team will be in touch
              with you shortly to confirm a visit time and answer any questions you have.
            </Text>

            <Text style={styles.p}>
              We know looking for care for someone you love is one of the most important decisions a
              family makes. There is no rush and no pressure—we encourage you to ask every question,
              big or small.
            </Text>

            <div style={styles.fieldGrid}>
              <Text style={styles.brandSuper}>Visiting Columbia Care</Text>
              {addressLine ? (
                <Text style={{ ...styles.fieldValue, margin: "6px 0 2px" }}>{addressLine}</Text>
              ) : null}
              {locationLine ? <Text style={styles.metaText}>{locationLine}</Text> : null}

              {phone ? (
                <div style={{ marginTop: "14px" }}>
                  <Text style={styles.fieldLabel}>Direct Phone</Text>
                  <Text style={{ ...styles.fieldValue, margin: 0 }}>
                    <Link
                      href={`tel:${phone.replace(/\D/g, "")}`}
                      style={{ color: SAGE, textDecoration: "none" }}
                    >
                      {phone}
                    </Link>
                  </Text>
                </div>
              ) : null}
            </div>

            <Text style={{ ...styles.p, fontSize: "14px", color: STONE }}>
              If you need immediate assistance or would rather speak directly with us now, please
              feel free to call us anytime.
            </Text>

            <Hr style={styles.divider} />

            <div style={styles.footer}>
              <Text style={{ ...styles.footerText, fontStyle: "italic" }}>
                Columbia Care Adult Family Home · A place to feel at home, a place to be cared for.
              </Text>
            </div>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// 3. Admin Direct Reply (Sent from Admin Console to Family)
// ---------------------------------------------------------------------------

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
  senderName = "Columbia Care Team",
}: AdminCustomerReplyProps) {
  const firstName = customerName.trim().split(/\s+/)[0] || customerName;

  return (
    <Html>
      <Head />
      <Preview>{`A message from Columbia Care regarding your tour enquiry`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            {/* Header */}
            <div style={styles.brandHeader}>
              <Text style={styles.brandSuper}>Columbia Care Adult Family Home</Text>
              <Heading style={styles.brandTitle}>Personal Follow-Up</Heading>
            </div>

            <Heading style={styles.h1}>Hello {firstName},</Heading>

            {/* Body Message */}
            <div
              style={{
                ...styles.p,
                whiteSpace: "pre-wrap",
                backgroundColor: "#FAF9F5",
                border: `1px solid ${RULE}`,
                borderRadius: "8px",
                padding: "20px 22px",
                margin: "18px 0",
              }}
            >
              {message}
            </div>

            <Text style={styles.p}>
              Warm regards,
              <br />
              <strong>{senderName}</strong>
              <br />
              <span style={{ color: STONE, fontSize: "14px" }}>
                Columbia Care Adult Family Home
              </span>
            </Text>

            <Hr style={styles.divider} />

            {/* Quick Contact Info */}
            <div style={{ textAlign: "left" }}>
              {addressLine ? (
                <Text style={{ ...styles.metaText, margin: "0 0 4px" }}>
                  <strong>Address:</strong> {addressLine}
                </Text>
              ) : null}
              {phone ? (
                <Text style={styles.metaText}>
                  <strong>Phone:</strong>{" "}
                  <Link
                    href={`tel:${phone.replace(/\D/g, "")}`}
                    style={{ color: SAGE, textDecoration: "none" }}
                  >
                    {phone}
                  </Link>
                </Text>
              ) : null}
            </div>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// 4. Stakeholder Status / Notes Update Alert
// ---------------------------------------------------------------------------

export interface StakeholderStatusUpdateProps {
  inquiryName: string;
  previousStatus: string;
  newStatus: string;
  notes: string | null;
  updatedBy: string;
  adminUrl: string;
  stakeholders?: string[];
}

export function StakeholderStatusUpdateEmail({
  inquiryName,
  previousStatus,
  newStatus,
  notes,
  updatedBy,
  adminUrl,
  stakeholders = [
    "Wondimubelete4@gmail.com",
    "Zgenet19@gmail.com",
    "leulsegedmelaku1020@gmail.com",
  ],
}: StakeholderStatusUpdateProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Enquiry Updated: ${inquiryName} → ${newStatus}`}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.card}>
            <div style={styles.brandHeader}>
              <Text style={styles.brandSuper}>Columbia Care Adult Family Home</Text>
              <Heading style={styles.brandTitle}>Pipeline Update</Heading>
            </div>

            <div style={styles.pillBadge}>Status Update</div>

            <Heading style={styles.h1}>Update on {inquiryName}</Heading>

            <Text style={styles.p}>
              An update was made to an active family inquiry by <strong>{updatedBy}</strong>:
            </Text>

            <div style={styles.fieldGrid}>
              <Text style={styles.fieldLabel}>Previous Status</Text>
              <Text style={{ ...styles.fieldValue, color: STONE }}>{previousStatus}</Text>

              <Text style={styles.fieldLabel}>New Status</Text>
              <Text style={{ ...styles.fieldValue, color: SAGE }}>{newStatus}</Text>

              {notes ? (
                <>
                  <Text style={styles.fieldLabel}>Latest Notes</Text>
                  <div style={styles.quoteBox}>&ldquo;{notes}&rdquo;</div>
                </>
              ) : null}
            </div>

            <Button href={adminUrl} style={styles.btnPrimary}>
              View in Admin Console →
            </Button>

            <Hr style={styles.divider} />

            <Text style={styles.metaText}>
              <strong>Stakeholders notified:</strong>
            </Text>
            <div style={{ margin: "4px 0 10px" }}>
              {stakeholders.map((sh) => (
                <span key={sh} style={styles.stakeholderBadge}>
                  {sh}
                </span>
              ))}
            </div>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
