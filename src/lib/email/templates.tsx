import {
  Body,
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
 * Transactional email.
 *
 * Two messages per enquiry: one to the owner so they can act, one to the family
 * so they know they were heard. The second matters more than it looks — a
 * family who submits a form into silence assumes the home is disorganised, at
 * exactly the moment they are comparing three of them.
 *
 * Brand colours are inlined as literals: email clients do not support CSS
 * custom properties, so the tokens cannot be used here.
 */

const INK = "#10254A";
const SAGE = "#3F5528";
const PAPER = "#F6F5EE";
const STONE = "#626859";
const RULE = "#D6D6C8";

const base = {
  body: { backgroundColor: PAPER, fontFamily: "Georgia, 'Times New Roman', serif", margin: 0 },
  container: { maxWidth: "560px", margin: "0 auto", padding: "32px 24px" },
  card: {
    backgroundColor: "#FCFBF6",
    border: `1px solid ${RULE}`,
    borderRadius: "4px",
    padding: "28px",
  },
  h1: { color: INK, fontSize: "24px", lineHeight: "1.2", margin: "0 0 16px" },
  text: {
    color: INK,
    fontFamily: "-apple-system, 'Segoe UI', sans-serif",
    fontSize: "16px",
    lineHeight: "1.6",
    margin: "0 0 14px",
  },
  meta: {
    color: STONE,
    fontFamily: "-apple-system, 'Segoe UI', sans-serif",
    fontSize: "14px",
    lineHeight: "1.5",
    margin: "0 0 6px",
  },
  label: {
    color: STONE,
    fontFamily: "monospace",
    fontSize: "11px",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    margin: "0 0 4px",
  },
};

export interface EnquiryEmailProps {
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  message: string | null;
  preferredTimes: string[];
  adminUrl: string;
}

/** Sent to the home. Optimised for reading on a phone, one thumb, in a hurry. */
export function OwnerNotification({
  name,
  email,
  phone,
  relationship,
  message,
  preferredTimes,
  adminUrl,
}: EnquiryEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`New enquiry from ${name}${phone ? ` — ${phone}` : ""}`}</Preview>
      <Body style={base.body}>
        <Container style={base.container}>
          <Section style={base.card}>
            <Heading style={base.h1}>New enquiry from {name}</Heading>

            <Text style={base.text}>
              Someone has asked about a house tour. Families usually contact two or three homes at
              once, so a reply today matters.
            </Text>

            <Hr style={{ borderColor: RULE, margin: "20px 0" }} />

            {phone ? (
              <>
                <Text style={base.label}>Phone</Text>
                <Text style={{ ...base.text, margin: "0 0 14px" }}>
                  <Link href={`tel:${phone.replace(/\D/g, "")}`} style={{ color: SAGE }}>
                    {phone}
                  </Link>
                </Text>
              </>
            ) : null}

            {email ? (
              <>
                <Text style={base.label}>Email</Text>
                <Text style={{ ...base.text, margin: "0 0 14px" }}>
                  <Link href={`mailto:${email}`} style={{ color: SAGE }}>
                    {email}
                  </Link>
                </Text>
              </>
            ) : null}

            {relationship ? (
              <>
                <Text style={base.label}>Who they&rsquo;re asking for</Text>
                <Text style={{ ...base.text, margin: "0 0 14px" }}>{relationship}</Text>
              </>
            ) : null}

            {preferredTimes.length > 0 ? (
              <>
                <Text style={base.label}>Best time to visit</Text>
                <Text style={{ ...base.text, margin: "0 0 14px" }}>
                  {preferredTimes.join(", ")}
                </Text>
              </>
            ) : null}

            {message ? (
              <>
                <Text style={base.label}>Their message</Text>
                <Text
                  style={{
                    ...base.text,
                    backgroundColor: PAPER,
                    borderLeft: `3px solid ${SAGE}`,
                    padding: "12px 14px",
                    margin: "0 0 14px",
                  }}
                >
                  {message}
                </Text>
              </>
            ) : null}

            <Hr style={{ borderColor: RULE, margin: "20px 0" }} />

            <Text style={base.meta}>
              <Link href={adminUrl} style={{ color: SAGE, fontWeight: 600 }}>
                Open this in the admin console
              </Link>{" "}
              to mark it as contacted or add a note.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export interface AutoReplyProps {
  name: string;
  phone: string | null;
  addressLine: string | null;
  locationLine: string | null;
}

/**
 * Sent to the family.
 *
 * Says only what is true: that the message arrived and someone will reply. It
 * promises no timeframe, because we cannot make a promise on the home's behalf
 * — that is the same rule that governs the website.
 */
export function FamilyAutoReply({ name, phone, addressLine, locationLine }: AutoReplyProps) {
  const firstName = name.trim().split(/\s+/)[0] || name;

  return (
    <Html>
      <Head />
      <Preview>We have your message — Columbia Care Adult Family Home</Preview>
      <Body style={base.body}>
        <Container style={base.container}>
          <Section style={base.card}>
            <Heading style={base.h1}>Thank you, {firstName}</Heading>

            <Text style={base.text}>
              We have your message, and someone from Columbia Care will get back to you.
            </Text>

            <Text style={base.text}>
              Looking for care for someone you love is hard, and you are welcome to ask us anything
              at all — including the awkward questions. There is no obligation, and most families
              visit two or three homes before they decide.
            </Text>

            <Hr style={{ borderColor: RULE, margin: "20px 0" }} />

            <Text style={base.label}>Where we are</Text>
            {addressLine ? (
              <Text style={{ ...base.text, margin: "0 0 6px" }}>{addressLine}</Text>
            ) : null}
            {locationLine ? <Text style={base.meta}>{locationLine}</Text> : null}

            {phone ? (
              <>
                <Text style={{ ...base.label, marginTop: "16px" }}>If you&rsquo;d rather talk</Text>
                <Text style={{ ...base.text, margin: 0 }}>
                  <Link href={`tel:${phone.replace(/\D/g, "")}`} style={{ color: SAGE }}>
                    {phone}
                  </Link>
                </Text>
              </>
            ) : null}

            <Hr style={{ borderColor: RULE, margin: "20px 0" }} />

            <Text style={{ ...base.meta, fontStyle: "italic" }}>
              Columbia Care Adult Family Home — a place to feel at home, a place to be cared for.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
