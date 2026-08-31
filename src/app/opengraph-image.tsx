import { ImageResponse } from "next/og";
import { identity, published } from "@/lib/content";

/**
 * The social share card.
 *
 * Generated from the brand rather than shipped as a static PNG, so it stays in
 * step with the tagline in the content file. Uses only confirmed copy, the
 * tagline and the promise, both verbatim from the client's infographic.
 *
 * Colours are literals: this renders in a separate image runtime with no access
 * to the site's CSS custom properties.
 */

export const alt = "Columbia Care Adult Family Home, Everett, Washington";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#10254A";
const PAPER = "#F6F5EE";
const SAGE = "#5E7C3C";
const SAGE_WASH = "#E7EBDC";

export default async function Image() {
  const tagline = published(identity.tagline) ?? "Columbia Care Adult Family Home";
  const promise = published(identity.promise);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: PAPER,
        padding: "80px",
        position: "relative",
      }}
    >
      {/* Sage rule down the left, echoing the site's section dividers. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "16px",
          background: SAGE,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "36px" }}>
        {/* Simplified monogram: a filled circle with a house, legible at card size. */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: INK,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "38px",
            color: PAPER,
          }}
        >
          ⌂
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "30px", color: INK, fontWeight: 700 }}>Columbia Care</div>
          <div style={{ fontSize: "19px", color: SAGE, letterSpacing: "0.14em" }}>
            ADULT FAMILY HOME
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: "62px",
          lineHeight: 1.12,
          color: INK,
          fontWeight: 700,
          maxWidth: "900px",
          display: "flex",
        }}
      >
        {tagline}
      </div>

      {promise ? (
        <div style={{ fontSize: "30px", color: "#33436A", marginTop: "28px", display: "flex" }}>
          {promise}
        </div>
      ) : null}

      <div
        style={{
          marginTop: "44px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          fontSize: "24px",
          color: INK,
        }}
      >
        <div
          style={{
            background: SAGE_WASH,
            borderRadius: "999px",
            padding: "10px 24px",
            display: "flex",
          }}
        >
          Everett, Washington
        </div>
      </div>
    </div>,
    size,
  );
}
